/*    
;=============================================    
; Author           :  Global Software's    
; Create date      :  29/06/2024    
; Created By       :  SWETHA    
; Description      :  OCR Summary Report For Woven     
; Change Person    :  M.SUGANYA	
; Last Change Date :  25-Feb-2025 10.30 AM
; ============================================= */    

CREATE PROCEDURE Proc_Rpt_OCR_Summary_Woven(@Guid varchar(256),@Ordid int)    

AS    



begin    



set nocount  on;    



declare @AvgPcsWt Numeric(18,3),@CutDelPcs int  



/*DRop table Tmp_OCRSummary*/    
/*create table Tmp_OCRSummary(guid varchar(256),Ordid int,Jobno int,Ordfinyear char(2),BuyOrdNo varchar(30) ,Deptid int,DeptName varchar(50),ReqKgs numeric(18,3)default 0,DelKgs numeric(18,3)default 0,RecKgs numeric(18,3)default 0,BalKgs numeric(18,3) 
default 0,LossPer numeric(9,3) default 0,DeptSlno int,TRanInKgs numeric(18,3) default 0,TRanOutKgs numeric(18,3) default 0 )  */    
/*alter table Tmp_OCRSummary add Retkgs numeric(18,3)*/  


delete from Tmp_OCRSummary    



delete from Tmp_OCR_AccSummary    



delete from Tmp_OCRSummary_Pcs      



/*Yarn requirement*/  



Insert into Tmp_OCRSummary (guid,Ordid,Deptid,ReqKgs,DeptSlno) select @guid,Yarn.Ordid,deptid,Sum(ReqKgs) as ReqKgs ,seq.sl  from Pro_ReqYarn Yarn(nolock) left outer join OrdSeq seq(nolock) on Yarn.ordid=seq.ordid and Yarn.DeptId=seq.Prs where Yarn.ordid=
@Ordid group by  Yarn.Ordid,deptid,seq.sl  order by seq.sl     

/*Fabric requirement*/ 

Insert into Tmp_OCRSummary (guid,Ordid,Deptid,ReqKgs,DeptSlno) select @guid,knitt.Ordid,deptid,Sum(ReqMtr) as ReqKgs ,seq.sl  from Pro_Reqknitt knitt (nolock) left outer join OrdSeq seq(nolock) on knitt.ordid=seq.ordid and knitt.DeptId=seq.Prs where knitt.ordid=@Ordid group by  knitt.Ordid,deptid, seq.sl order by seq.sl      


Insert into Tmp_OCRSummary (guid,Ordid,Deptid,ReqKgs,DeptSlno) select @guid,@Ordid,-7,0as ReqKgs ,9999  





/*Y/F Deliveries*/    

update Tmp_OCRSummary set DelKgs = x.DelKgs from   (select ordid,Prs_dept,sum(mtr) as DelKgs from trs_del1 MAs(nolock)  inner join Trs_del2 dtl (nolock) on Mas.id=Dtl.id   where trtype=1 And ProcessType='P' and Ordid= @Ordid group by Ordid,Prs_dept )x   inner join Tmp_OCRSummary tmp on x.ordid=tmp.ordid and x.Prs_dept=tmp.deptid and tmp.Guid=@guid     

/* Multiprocess Receipt - DC UPdate */


update Tmp_OCRSummary set DelKgs = isNull(tmp.Delkgs,0)+x.DelKgs from   (select ordid,Dtl1.DeptId,sum(Dtl1.DCmtr) as DelKgs from Trs_MultiPrs_Grn1 MAs(nolock)  inner join Trs_MultiPrs_Grn2 dtl (nolock) on Mas.id=Dtl.id  INNER JOIN Trs_MultiPrs_Grn3 Dtl1 ON  Mas.Id =Dtl1.ID and dtl.RowSlno = dtl1.Slno where ProcessType='P'  and Ordid= @Ordid And RowSlno<>1 group by Ordid,Dtl1.deptID)x     inner join Tmp_OCRSummary tmp on x.ordid=tmp.ordid and x.DeptID=tmp.deptid and tmp.Guid=@guid  



update Tmp_OCRSummary set RDelKgs = x.DelKgs from (select ordid,Prs_dept,sum(mtr) as DelKgs from trs_del1 MAs(nolock)  inner join Trs_del2 dtl (nolock) on Mas.id=Dtl.id   where trtype=1 And ProcessType='R' and Ordid= @Ordid group by Ordid,Prs_dept )x     inner join Tmp_OCRSummary tmp on x.ordid=tmp.ordid and x.Prs_dept=tmp.deptid and tmp.Guid=@guid     







/*Y/F Receipts*/    







update tmp set RecKgs = x.RecKgs from    (select ordid,Dept,sum(Recmtr) as RecKgs from trs_grn1 MAs(nolock)  inner join Trs_grn2 dtl (nolock) on Mas.id=Dtl.id   where grntype in ('Process' ,'Purchase') And ISNULL(processtype,'P')='P' and Ordid= @Ordid group by Ordid,Dept )x inner join Tmp_OCRSummary tmp on x.ordid=tmp.ordid   and x.Dept=tmp.deptid and tmp.Guid=@guid  











/* Multiprocess Receipt - GRN UPdate */







update tmp set RecKgs = IsNull(tmp.RecKgs,0)+x.RecKgs from    (select ordid,Dtl1.DeptID as Dept,sum(GRNMtrs) as RecKgs from Trs_MultiPrs_Grn1 MAs(nolock)  inner join Trs_MultiPrs_Grn2 dtl (nolock) on Mas.id=Dtl.id  INNER JOIN Trs_MultiPrs_Grn3 Dtl1 ON  Mas
.Id =Dtl1.ID and dtl.RowSlno = dtl1.Slno  where grntype in ('Process' ,'Purchase') And ISNULL(processtype,'P')='P' and Ordid= @Ordid and FinalProcess='N'  group by Ordid,Dtl1.DeptID )x inner join Tmp_OCRSummary tmp on x.ordid=tmp.ordid   and x.Dept=tmp.deptid and tmp.Guid=@guid  









update tmp set RRecKgs = x.RecKgs from     (select ordid,Dept,sum(Recmtr) as RecKgs from trs_grn1 MAs(nolock)  inner join Trs_grn2 dtl (nolock) on Mas.id=Dtl.id   where grntype in ('Process' ,'Purchase') And processtype='R' and Ordid= @Ordid group by Ordid,Dept )x inner join Tmp_OCRSummary tmp on x.ordid=tmp.ordid   and x.Dept=tmp.deptid and tmp.Guid=@guid  







  /*  Opening Stock */











  /*  update Tmp_OCRSummary set RecKgs = (x.RecKgs + Tmp.RecKgs ) from  (Select Ordid,Dept,sum(Kgs) as RecKgs  from Trs_Opening where Ordid= @Ordid  group by  Ordid,Dept )x  inner  join Tmp_OCRSummary tmp on x.ordid=tmp.ordid and x.Dept=tmp.deptid and tmp
.Guid=@Guid */





    update Tmp_OCRSummary set OpeningKgs = IsNull(x.OpeningKgs,0) from  (Select Ordid,Dept,sum(MtrPc) as OpeningKgs  from Trs_Opening where Ordid= @Ordid  group by  Ordid,Dept )x  inner  join Tmp_OCRSummary tmp on x.ordid=tmp.ordid and x.Dept=tmp.deptid and
 tmp.Guid=@Guid





 /* Stock Adjustment */



	update Tmp_OCRSummary set AddStkAdjKgs= IsNull(x.AddStkAdjKgs,0) from   (select ordid,Prs_dept,sum(mtr) as AddStkAdjKgs from trs_del1 MAs(nolock)  inner join Trs_del2 dtl (nolock) on Mas.id=Dtl.id   where trtype=5 And ProcessType='' And dtl.StockAddLess = 'Add' and Ordid= @Ordid group by Ordid,Prs_dept )x   inner join Tmp_OCRSummary tmp on x.ordid=tmp.ordid and x.Prs_dept=tmp.deptid and tmp.Guid=@guid    



   	update Tmp_OCRSummary set LessStkAdjKgs= IsNull(x.LessStkAdjKgs,0) from   (select ordid,Prs_dept,sum(mtr) as LessStkAdjKgs from trs_del1 MAs(nolock)  inner join Trs_del2 dtl (nolock) on Mas.id=Dtl.id   where trtype=5 And ProcessType='' And dtl.StockAddLess = 'Less' and Ordid= @Ordid group by Ordid,Prs_dept )x   inner join Tmp_OCRSummary tmp on x.ordid=tmp.ordid and x.Prs_dept=tmp.deptid and tmp.Guid=@guid    



	/*Chandru*/
	/*sales*/
	update Tmp_OCRSummary set sales = x.DelKgs from (select dtl.ordid,Dept as prs_dept,isnull(sum(mtr),0) as DelKgs from trs_del1 MAs(nolock)  inner join Trs_del2 dtl (nolock) on Mas.id=Dtl.id   inner join stocktable on stocktable.StockID= dtl.StockID  where  trtype=2 And ProcessType='P' and SalCumInv ='Y' and dtl.Ordid= @Ordid group by dtl.Ordid,Prs_dept,Dept )x     inner join Tmp_OCRSummary tmp on x.ordid=tmp.ordid and x.Prs_dept=tmp.deptid and tmp.Guid=@guid
  
  /*sales retrn*/
update tmp set sales = sales - isnull(x.RecKgs,0) from     (select dtl.ordid,a.Dept,sum(Recmtr) as RecKgs from trs_grn1 MAs(nolock)  inner join Trs_grn2 dtl (nolock) on Mas.id=Dtl.id inner join StockTable a on a.StockID =dtl.StockID   where grntype in ('Sales Return')  and dtl.Ordid= @Ordid group by dtl.Ordid,a.Dept )x inner join Tmp_OCRSummary tmp on x.ordid=tmp.ordid   and x.Dept=tmp.deptid and tmp.Guid=@guid  





  
  /*Y/F ReturnKgs */    







update tmp set Retkgs = x.RecKgs from     (select ordid,Dept,sum(Recmtr) as RecKgs from trs_grn1 MAs(nolock)  inner join Trs_grn2 dtl (nolock) on Mas.id=Dtl.id   where grntype in ('Process Return') and Ordid= @Ordid group by Ordid,Dept )x inner join Tmp_OCRSummary tmp on x.ordid=tmp.ordid  and x.Dept=tmp.deptid and tmp.Guid=@guid     





/*Unit Return (Cutting)*/    --swetha 20-06-2023



update tmp set Retkgs = (x.AKg + isnull(tmp.Retkgs,0)) from (select OrdId,Prs_Dept,sum(AMtr) as AKg from Trs_Del1 Mas (nolock)  INNER JOIN Trs_Del2 Dtl (nolock) ON Mas.ID = Dtl.ID where DELTYPE='R' and OrdId=@Ordid group by OrdId,Prs_Dept) x inner join Tmp_OCRSummary tmp on x.ordid=tmp.ordid  and x.Prs_Dept=tmp.deptid and tmp.Guid=@guid







--update tmp set RRetkgs = x.RecKgs from     



--(select ordid,Dept,sum(RecKgs) as RecKgs from trs_grn1 MAs(nolock)  inner join Trs_grn2 dtl (nolock) on Mas.id=Dtl.id   where grntype in ('Process Return') And processtype='R' and Ordid= @Ordid group by Ordid,Dept )x inner join Tmp_OCRSummary tmp on x.ordid=tmp.ordid --and x.Dept=tmp.deptid and tmp.Guid=@guid     







/*TRansfer In */    







update tmp set TRanInKgs = x.TRanInKg from(select TranOrdID as ORdid ,PRs_dePt,sum(mtr) as TRanInKg from trs_del1 MAs(nolock) inner join  trS_del2 dtl(nolock) on MAs.id=Dtl.id where trtype=3 and  TranOrdID= @Ordid group by TranOrdID  ,PRs_dePt ) x     inner join Tmp_OCRSummary tmp on x.ordid=tmp.ordid and x.Prs_dept=tmp.deptid and tmp.Guid=@guid     











/*Transfer Out */    







update tmp set TRanOutKgs = x.TRanOutKg from (select OrdID as ORdid ,PRs_dePt,sum(mtr) as TRanOutKg from trs_del1 MAs(nolock) inner join  trS_del2 dtl(nolock) on MAs.id=Dtl.id where trtype=3 and OrdID= @Ordid group by OrdID  ,PRs_dePt ) x     inner join Tmp_OCRSummary tmp on x.ordid=tmp.ordid and x.Prs_dept=tmp.deptid and tmp.Guid=@guid     







/*Shortage*/ --Nasima  On 18-June-2018



Update Tmp Set ShortageKgs=X.ShortKgs From(Select OrdID,Dept,Sum(ShortMtr) as ShortKgs From Trs_Shortage Where Dept Not In (0,16,17) Group by OrdID,Dept)X INNER JOIN Tmp_OCRSummary Tmp ON  X.Ordid=Tmp.Ordid and X.Dept=Tmp.Deptid and Tmp.Guid=@guid  











--poomani 23-Mar-2022







Insert into Tmp_OCRSummary_Pcs (guid,Ordid,Deptid,DelKgs,RecKgs,DeptSlno,PartName,StyleNo)     



--select @guid,X.OrdId,id,Min(ProdPcs) as ProdPcs ,Seq.sl as Sl,PartName,StyleNo from(select ordid,m_stage.id,stageid,sum(ProdPcs) as ProdPcs ,mas_dept.OrderSno,PartName,StyleNo from Trs_Prodentry MAs inner join Trs_ProdentryQty Dtl on MAS.id=Dtl.id left outer join Mas_JobWrkComp M_stage on MAS.StageID =M_stage.Id LEFT OUTER JOIN Mas_Dept ON M_stage.DeptId = Mas_Dept.DeptID LEFT OUTER JOIN Mas_Part ON Mas.PartId = Mas_Part.PartId --where ordid=@ORdid group by M_stage.id,stageid,ordid,Mas_Dept.OrderSno,PartName,StyleNo) X left outer join OrdSeq seq(nolock) on X.ordid=seq.ordid and X.id=seq.Prs where id not in (select deptid from Tmp_OCRSummary_Pcs where guid=@guid) group by id,X.ordid,Seq.sl,X.PartName,X.StyleNo     







/*Pcs Delivery*/    



--insert into Tmp_OCRSummary_Pcs (guid,Ordid,Deptid,DelKgs,RecKgs,DeptSlno,PartName,StyleNo)    







Select X.GuiId,X.ordid,X.TargetStageID,Sum(X.Pcs),Sum(X.RecPcs),X.sl,X.PartName,X.StyleNo From (select @guid As GuiId,OrdJobno as ordid ,TargetStageID,sum(Pcs) As Pcs,0 As RecPcs,seq.sl,PartName,StyleNo  from trs_pcs1 MAs(nolock)  inner join trs_pcs2 dtl(
nolock) on MAs.id=dtl.id left outer join OrdSeq seq(nolock) on MAs.ordjobno=seq.ordid and MAs.Dept=seq.Prs LEFT OUTER JOIN Mas_Part ON Dtl.PartId = Mas_Part.PartId where deltype='Process' And ProcessType='P' and   Ordjobno = @Ordid group by OrdJobno ,TargetStageID,seq.sl,PartName,StyleNo Union select @guid As GuiId,OrdJob as ordid ,TargetStageID,0 As Pcs,Sum(recPcs) As RecPcs,seq.sl,PartName,StyleNo  from Trs_PcsGrn1 MAs(nolock)   inner join Trs_PcsGrn2 dtl(nolock) on MAs.id=dtl.id  left outer join Mas_JobWrkComp M_stage on MAS.TargetStageID =M_stage.Id LEFT OUTER JOIN Mas_Dept ON M_stage.DeptId = Mas_Dept.DeptID left outer join OrdSeq seq(nolock) on MAs.ordjob=seq.ordid and Mas_Dept.DeptID=seq.Prs LEFT OUTER JOIN Mas_Part ON Dtl.PartId = Mas_Part.PartId where GrnType='Process Receipt' And ProcessType='P' and Ordjob = @Ordid group by OrdJob ,TargetStageID,seq.sl,PartName,StyleNo Union



--select @guid,Y.OrdId,stageid,0,Min(ProdPcs) as ProdPcs,Seq.sl as Sl,PartName,StyleNo from(select ordid,Mas_Dept.DeptID as id,stageid,sum --Nasi



select @guid,Y.OrdId,stageid,0,0 as ProdPcs,Seq.sl as Sl,PartName,StyleNo from(select ordid,Mas_Dept.DeptID as id,stageid,sum(ProdPcs) as ProdPcs ,mas_dept.OrderSno,PartName,StyleNo from Trs_Prodentry MAs inner join Trs_ProdentryQty Dtl on MAS.id=Dtl.id left outer join Mas_JobWrkComp M_stage on MAS.StageID =M_stage.Id LEFT OUTER JOIN Mas_Dept ON M_stage.DeptId = Mas_Dept.DeptID LEFT OUTER JOIN Mas_Part ON Mas.PartId = Mas_Part.PartId where ordid=@ORdid group by Mas_Dept.Deptid,stageid,ordid,Mas_Dept.OrderSno,PartName,StyleNo) Y left outer join OrdSeq seq(nolock) on Y.ordid=seq.ordid  and Y.id=seq.Prs where id not in (select deptid from Tmp_OCRSummary_Pcs where guid=@guid) group by stageid,Y.ordid,Seq.sl,Y.PartName,Y.StyleNo ) X Group By X.GuiId,X.ordid,X.
TargetStageID,X.sl,X.PartName,X.StyleNo order by X.sl      



update Tmp_OCRSummary_Pcs set RDelKgs = x.Pcs from     (select OrdJobno as ordid ,TargetStageID,sum(Pcs) as Pcs,StyleNo,PartName from trs_pcs1 MAs (nolock)  inner join trs_pcs2 dtl(nolock)  on MAs.id=dtl.id  left outer join Mas_Part on Dtl.PartId=Mas_Part


.PartId where deltype='Process' And ProcessType='R' and Ordjobno =@Ordid group by Ordjobno ,TargetStageID,StyleNo,PartName ) x inner join Tmp_OCRSummary_Pcs tmp on x.ordid =tmp.ordid and x.TargetStageID=tmp.deptid And x.StyleNo=tmp.StyleNo And x.PartName=tmp.PartName and tmp.Guid=@guid    







/*



update Tmp_OCRSummary_Pcs set RecKgs = (x.RecPcs + RecKgs ) from     (select OrdJob as ordid ,TargetStageID,sum(RecPcs) as RecPcs,StyleNo,PartName from trs_pcsgrn1 MAs (nolock)  inner join trs_pcsgrn2 dtl(nolock)  on MAs.id=dtl.id  left outer join Mas_Par






t on Dtl.PartId=Mas_Part.PartId where GrnType ='Process Receipt' And ProcessType='P' and Ordjob =@Ordid group by OrdJob ,TargetStageID,StyleNo,PartName ) x inner join Tmp_OCRSummary_Pcs tmp on x.ordid =tmp.ordid and x.TargetStageID=tmp.deptid And x.StyleN


o=tmp.StyleNo And x.PartName=tmp.PartName and tmp.Guid=@guid 







*/







/* InHouse Production*/







--Nasima







update tmp set tmp.InhouseProdPcs=ProdPcs from    (select X.Ordid,Deptid,stageid,Min(ProdPcs) as ProdPcs,X.StyleNo,X.PartName from(select MAS.Ordid, Mas_Dept.Deptid,stageid,sum(ProdPcs) as ProdPcs,StyleNo,PartName from Trs_Prodentry MAs inner join Trs_ProdentryQty Dtl on MAS.id=Dtl.id left outer join Mas_JobWrkComp M_stage on MAS.StageID =M_stage.Id  LEFT OUTER JOIN Mas_Dept ON M_stage.DeptId = Mas_Dept.DeptID  left outer join Mas_Part on MAS.PartId=Mas_Part.PartId where MAS.ordid=@ORdid and  Mas.Rework=0  group by Mas_Dept.Deptid,stageid,MAS.Ordid,StyleNo,PartName,Mas_Dept.OrderSno) X group by stageid,X.Ordid,X.StyleNo,X.PartName,X.deptid)Y inner join Tmp_OCRSummary_Pcs tmp on Y.ordid=tmp.ordid and Y.stageid=tmp.deptid And Y.StyleNo=tmp.StyleNo And Y.PartName=tmp.PartName and tmp.Guid=@guid  left outer join OrdSeq seq(nolock) on Y.ordid=seq.ordid  and Y.deptid=seq.Prs 





/* ASLAM - 14-Aug-2021  where Y.DeptID not in (
select deptid from Tmp_OCRSummary_Pcs where guid=@guid)  */

 /*  Multi Process */ 


   update Tmp_OCRSummary_Pcs set RecKgs = (x.RecPcs + RecKgs ) from (select OrdJob as ordid ,trs_pcsgrn3.StageID as TargetStageID,sum(RecPcs) as RecPcs,StyleNo,PartName from trs_pcsgrn1 inner join trs_pcsgrn2 on trs_pcsgrn1.id=trs_pcsgrn2.id  inner join trs_pcsgrn3 on trs_pcsgrn1.Id = trs_pcsgrn3.Id and trs_pcsgrn1.TargetStageID <> trs_pcsgrn3.StageID left outer join Mas_Part on trs_pcsgrn2.PartId=Mas_Part.PartId where GrnType ='Process Receipt' And ProcessType='P' and OrdJob = @Ordid Group by OrdJob,trs_pcsgrn3.StageID,StyleNo,PartName)X inner join Tmp_OCRSummary_Pcs tmp on x.ordid =tmp.ordid and x.TargetStageID=tmp.deptid And x.StyleNo=tmp.StyleNo And x.PartName=tmp.PartName and tmp.Guid=@guid 







 /*  Opening Stock */ 



   update Tmp_OCRSummary_Pcs set RecKgs = (x.RecKgs + tmp.RecKgs ) from     ( select OrdId ,StageId ,sum (Qty) as RecKgs,StyleNo,PartName  from Trs_PcsOpening inner join Mas_JobWrkComp on Trs_PcsOpening.StageId = Mas_JobWrkComp .Id left outer join Mas_Part on Trs_PcsOpening.PartId=Mas_Part.PartId where ordid = @Ordid  group by OrdId,StageId,StyleNo,PartName )x  inner  join Tmp_OCRSummary_Pcs tmp on x.ordid=tmp.ordid and x.StageId=tmp.deptid And x.StyleNo=tmp.StyleNo And x.PartName=tmp.PartName and tmp.Guid=@Guid







update Tmp_OCRSummary_Pcs set RRecKgs = x.RecPcs from     (select OrdJob as ordid ,TargetStageID,sum(RecPcs) as RecPcs,StyleNo,PartName from trs_pcsgrn1 MAs (nolock) inner join trs_pcsgrn2 dtl(nolock)  on MAs.id=dtl.id  left outer join Mas_Part on Dtl.PartId=Mas_Part.PartId where GrnType ='Process Receipt' And ProcessType='R' and Ordjob =@Ordid group by OrdJob ,TargetStageID,StyleNo,PartName ) x inner join Tmp_OCRSummary_Pcs tmp on x.ordid =tmp.ordid and x.TargetStageID=tmp.deptid And x.StyleNo=tmp.StyleNo And x.PartName=tmp.PartName and tmp.Guid=@guid    







/*  Multi ReProcess */ 







update Tmp_OCRSummary_Pcs set RRecKgs = (x.RecPcs + RRecKgs ) from     (select OrdJob as ordid ,trs_pcsgrn3.StageID as TargetStageID,sum(RecPcs) as RecPcs,StyleNo,PartName from trs_pcsgrn1 MAs (nolock)  inner join trs_pcsgrn2 dtl(nolock)  on MAs.id=dtl.id  inner join trs_pcsgrn3 on MAs.Id = trs_pcsgrn3.Id and MAs.TargetStageID <> trs_pcsgrn3.StageID left outer join Mas_Part on Dtl.PartId=Mas_Part.PartId where GrnType ='Process Receipt' And ProcessType='R' and Ordjob =@Ordid group by OrdJob ,trs_pcsgrn3.StageID,StyleNo,PartName ) x inner join Tmp_OCRSummary_Pcs tmp on x.ordid =tmp.ordid and x.TargetStageID=tmp.deptid And x.StyleNo=tmp.StyleNo And x.PartName=tmp.PartName and tmp.Guid=@guid   



update Tmp_OCRSummary_Pcs set RetKgs = x.RecPcs from     (select OrdJob as ordid ,trs_pcs1.TargetStageID,sum(RecPcs) as RecPcs,StyleNo,PartName from trs_pcsgrn1 MAs (nolock)  inner join trs_pcsgrn2 dtl(nolock)  on MAs.id=dtl.id inner join trs_pcs1 on trs_pcs1.Id = MAs.Ourdcref  left outer join Mas_Part on Dtl.PartId=Mas_Part.PartId where GrnType ='Process Return' And MAs.ProcessType='P' and Ordjob =@Ordid group by OrdJob ,trs_pcs1.TargetStageID,StyleNo,PartName ) x inner join Tmp_OCRSummary_Pcs tmp on x.ordid=tmp.ordid and x.TargetStageID=tmp.deptid And x.StyleNo=tmp.StyleNo And x.PartName=tmp.PartName and tmp.Guid=@guid    





update Tmp_OCRSummary_Pcs set RRetKgs = x.RecPcs from     (select OrdJob as ordid ,TargetStageID,sum(RecPcs) as RecPcs,StyleNo,PartName from trs_pcsgrn1 MAs (nolock)  inner join trs_pcsgrn2 dtl(nolock)  on MAs.id=dtl.id  left outer join Mas_Part on Dtl.PartId=Mas_Part.PartId where GrnType ='Process Return' And ProcessType='R' and Ordjob =@Ordid group by OrdJob ,TargetStageID,StyleNo,PartName ) x inner join Tmp_OCRSummary_Pcs tmp on x.ordid =tmp.ordid and x.TargetStageID=tmp.deptid And x.StyleNo=tmp.StyleNo And x.PartName=tmp.PartName and tmp.Guid=@guid    











Insert into Tmp_OCRSummary_Pcs (guid,Ordid,Deptid,deptname,ReqKgs ,DelKgs,DeptSlno,PartName,StyleNo)    select @guid,Ordermas.ordid,0,'DESPATCHED',  (select sum (cutplanqty) from OrderQtyDtl where ordid = @Ordid) REqPcs,sum(Pcs ) as despatchPcs ,300 as Sno,PartName,Dtl.StyleNo from trs_pcs1 MAs inner join trs_pcs2 Dtl on MAs.id=Dtl.id INNER JOIN OrderStyleDtl ON OrderStyleDtl.OrdID = Mas.Ordjobno AND OrderStyleDtl.StyleNo = Dtl.StyleNo inner join orderqtydtl orddtl on MAs.Ordjobno =orddtl.ordid and Dtl.styleno =orddtl.styleno and Dtl.ColID  =orddtl.ColID and  Dtl.SizeID  =orddtl.SizeId and dtl.lotno = orddtl.lotno INNER JOIN OrderMas on MAs.Ordjobno  = OrderMas .ordid LEFT OUTER JOIN Mas_Part ON Dtl.PartId = Mas_Part.PartId where deltype='Despatch'  and ordjobno=@Ordid and EntryOption = 1 group by Ordermas.ordid,PartName,Dtl.StyleNo    











Insert into Tmp_OCRSummary_Pcs (guid,Ordid,Deptid,deptname,ReqKgs ,DelKgs,DeptSlno,PartName,StyleNo)    select @guid,Ordermas.ordid,0,'DESPATCHED',  sum(Round(SizeQty+(SizeQty*Exs_Per/100),0)) As REqPcs,sum(Pcs ) as despatchPcs ,300 as Sno,PartName,Dtl.StyleNo from trs_pcs1 MAs inner join trs_pcs2 Dtl on MAs.id=Dtl.id INNER JOIN OrderStyleDtl ON OrderStyleDtl.OrdID = Mas.Ordjobno AND OrderStyleDtl.StyleNo = Dtl.StyleNo inner join OrdQtyClrDtl orddtl on MAs.Ordjobno =orddtl.ordid and Dtl.styleno =orddtl.styleno and Dtl.ColID  =orddtl.CmbClrID  and  Dtl.SizeID  =orddtl.SizeId and dtl.LotNo = orddtl.LotNo  INNER JOIN OrderMas on MAs.Ordjobno  = OrderMas.ordid LEFT OUTER JOIN Mas_Part ON Dtl.PartId = Mas_Part.PartId where deltype='Despatch' and ordjobno=@Ordid and EntryOption = 2 group by ordermas.ordid,PartName,Dtl.StyleNo    







/*



 -- Done on 14-Mar-23 - for ak 179/22 (truworth) - uday - kanmani - point no 1987



*/



update Tmp_OCRSummary_Pcs set ReqKgs =  REqPcs from    (select OrderQtyDtl.ordid,sum(cutplanqty) as REqPcs,OrderQtyDtl.StyleNo,PartName from OrderQtyDtl INNER JOIN OrderStyleDtl ON OrderStyleDtl.OrdID = OrderQtyDtl.OrdID AND OrderStyleDtl.StyleNo = OrderQtyDtl.StyleNo inner join OrderMas on OrderQtyDtl.ordid=OrderMas.ordid inner join Order_PartDtl on OrderQtyDtl.ordid=Order_PartDtl.ordid AND Order_PartDtl.StyleNo = OrderQtyDtl.StyleNo Inner Join Mas_Part On Order_PartDtl.PartId=Mas_Part.PartId where OrderQtyDtl.ordid = @Ordid And EntryOption=1 group by OrderQtyDtl.Ordid,OrderQtyDtl.StyleNo,PartName Union select OrderQtyDtl.ordid,sum(Round(SizeQty+(SizeQty*Exs_Per/100),0)) as REqPcs,OrderQtyDtl.StyleNo,PartName from OrdQtyClrDtl OrderQtyDtl INNER JOIN OrderStyleDtl ON OrderStyleDtl.OrdID = OrderQtyDtl.OrdID AND OrderStyleDtl.StyleNo = OrderQtyDtl.Styleno inner join OrderMas on OrderQtyDtl.ordid=OrderMas.ordid inner join Order_PartDtl on OrderMas.ordid=Order_PartDtl.ordid And Order_PartDtl.StyleNo = OrderQtyDtl.Styleno Inner Join Mas_Part On Order_PartDtl.PartId=Mas_Part.PartId where OrderQtyDtl.ordid = @Ordid And EntryOption=2 group by OrderQtyDtl.Ordid,OrderQtyDtl.StyleNo,PartName)x inner join Tmp_OCRSummary_Pcs tmp on x.ordid=tmp.ordid  AND x.StyleNo=tmp.StyleNo  inner join Mas_JobWrkComp on Tmp.deptid=Mas_JobWrkComp.id inner join Mas_dept Dept on Mas_JobWrkComp.deptid=Dept.Deptid where DEpt.OutputType  ='P'  and Tmp.guid=@Guid     







/*  -- commented on 14-Mar-23 - for ak 179/22 (truworth) - uday - kanmani - point no 1987



update Tmp_OCRSummary_Pcs set ReqKgs =  REqPcs from    



(select OrderQtyDtl.ordid,sum(cutplanqty) as REqPcs,OrderQtyDtl.StyleNo,PartName from OrderQtyDtl INNER JOIN OrderStyleDtl ON OrderStyleDtl.OrdID = OrderQtyDtl.OrdID AND OrderStyleDtl.StyleNo = OrderQtyDtl.StyleNo



inner join OrderMas on OrderQtyDtl.ordid=OrderMas.ordid inner join Order_PartDtl on OrderQtyDtl.ordid=Order_PartDtl.ordid AND Order_PartDtl.StyleNo = OrderQtyDtl.StyleNo



Inner Join Mas_Part On Order_PartDtl.PartId=Mas_Part.PartId where OrderQtyDtl.ordid = @Ordid  group by OrderQtyDtl.Ordid,OrderQtyDtl.StyleNo,PartName)x 



inner join Tmp_OCRSummary_Pcs tmp on x.ordid=tmp.ordid  AND x.StyleNo=tmp.StyleNo  



inner join Mas_JobWrkComp on Tmp.deptid=Mas_JobWrkComp.id 



inner join Mas_dept Dept on Mas_JobWrkComp.deptid=Dept.Deptid 



where DEpt.OutputType  ='P'  and Tmp.guid=@Guid   



 */







update tmp set tmp.jobno= Ord.Jobno, tmp.ordfinyear=Ord.finyear ,tmp.buyORDno=Ord.buyORDno from  Tmp_OCRSummary tmp inner join Ordermas Ord on tmp.ordid=ord.ordid where tmp.guid=@guid and tmp.ordid=@Ordid    







update  tmp set tmp.deptname= dept.ShortDept from  Tmp_OCRSummary tmp inner join MAs_dept dept on tmp.deptid=dept.deptid     



update  tmp set tmp.deptname= Mas_JobWrkComp.WorkComplDet from  Tmp_OCRSummary_Pcs tmp inner join Mas_JobWrkComp on Tmp.deptid=Mas_JobWrkComp.id inner join MAs_dept dept on Mas_JobWrkComp.deptid=dept.deptid     SELECT @AvgPcsWt = SUM(pcswt) from (select compid,AVG(pcswgt) pcswt from Prog_ClrComb A inner join Prog_Cns B on A.ID = B.ID  where OrdID = @Ordid  group by compid ) X  







Update Tmp_OCRSummary_Pcs Set AvgPcsWt =  @AvgPcsWt where Deptid = 1  



/* Shortage */ --Nasima  



Update Tmp_OCRSummary_Pcs Set ShortageKgs=X.ShoratgePcs From (Select Ordid,StyleNo,Trs_ShortagePcs.PartId,Mas_Part.PartName,Sum(SizeQty) as ShoratgePcs From Trs_ShortagePcs INNER JOIN Mas_Part ON Mas_Part.PartID=Trs_ShortagePcs.PartId Group By OrdID,StyleNo,Trs_ShortagePcs.PartId,Mas_Part.PartName )X INNER JOIN Tmp_OCRSummary_Pcs ON Tmp_OCRSummary_Pcs.Ordid=X.OrdID and Tmp_OCRSummary_Pcs.StyleNo=X.StyleNo and Tmp_OCRSummary_Pcs.PartName=X.PartName Where Tmp_OCRSummary_Pcs.guid=@Guid and Tmp_OCRSummary_Pcs.Ordid=@Ordid 



Select   @CutDelPcs = case when AvgPcsWt >0 then (Delkgs / AvgPcsWt * 1000) Else 0 END  from Tmp_OCRSummary_Pcs where isnull(delkgs,0)>0 and guid=@guid  and Deptid = 11 and Ordid =@Ordid   

Update Tmp_OCRSummary_Pcs set CutDelPcs = @CutDelPcs Where isnull(delkgs,0)>0 and guid=@guid  and Deptid = 1 and Ordid =@Ordid   



--update Tmp_OCRSummary set  BalKgs =ReqKgs - (IsNull(REcKgs,0) + IsNull(TRanInKgs,0) -IsNull(TRanOutKgs,0))  where  (isnull(delkgs,0)>0 OR IsNull(TRanInKgs,0) > 0  or IsNull(TRanOutKgs,0) > 0 ) and guid=@guid  and Deptid <> 11 and Deptid <= 4  











update Tmp_OCRSummary set  BalKgs =ReqKgs - (IsNull(REcKgs,0) + IsNull(TRanInKgs,0) -IsNull(TRanOutKgs,0))  where  (isnull(delkgs,0)>0 OR IsNull(TRanInKgs,0) > 0  or IsNull(TRanOutKgs,0) > 0 ) and guid=@guid  and Deptid <> 11 and Deptid <= 4  and Tmp_OCRSummary.Deptid <> 0











update Tmp_OCRSummary set  lossper =  case when (DelKgs+IsNull(TRanInKgs,0) -IsNull(TRanOutKgs,0)) >0 then ((BalKgs/(DelKgs+IsNull(TRanInKgs,0) -IsNull(TRanOutKgs,0)))*100) ELSE 0 End where isnull(delkgs,0)>=0  and guid=@guid   and Deptid <> 11 and Deptid <= 4  and Tmp_OCRSummary.Deptid <> 0







update Tmp_OCRSummary set  BalKgs =DelKgs - (IsNull(REcKgs,0) + IsNull(RetKgs,0))  where isnull(delkgs,0)>0 and guid=@guid  and Deptid <> 11 and Deptid >=4 And (Select IsNull(ProdDept,'N') From Mas_Dept Where Mas_Dept.DeptId=Tmp_OCRSummary.DeptId)='N'  











---Nasima



--update Tmp_OCRSummary_Pcs set  BalKgs = (ReqKgs - IsNull(REcKgs,0) + IsNull(RDelKgs,0) - IsNull(RRecKgs,0))  where guid=@guid  and Deptid <> 1 And (Select Distinct IsNull(ProdDept,'N') From Mas_JobWrkComp Inner Join Tmp_OCRSummary_Pcs on Tmp_OCRSummary_Pcs.DeptId = Mas_JobWrkComp.Id Inner Join Mas_dept on Mas_dept.DeptID = Mas_JobWrkComp.DeptId 



--Where Mas_JobWrkComp.Id=Tmp_OCRSummary_Pcs.DeptId)='Y'  







--Nasima On 24-Feb-2018 (For Vivid)



--update Tmp_OCRSummary_Pcs set  BalKgs = (ReqKgs - IsNull(REcKgs,0) - IsNull(DelKgs,0) - IsNull(RRecKgs,0))  where guid=@guid  and Deptid <> 1 And (Select Distinct IsNull(ProdDept,'N') From Mas_JobWrkComp Inner Join Tmp_OCRSummary_Pcs on Tmp_OCRSummary_Pcs.DeptId = Mas_JobWrkComp.Id Inner Join Mas_dept on Mas_dept.DeptID = Mas_JobWrkComp.DeptId Where Mas_JobWrkComp.Id=Tmp_OCRSummary_Pcs.DeptId and IsNull(ProdDept,'N')='Y')='Y' 







update Tmp_OCRSummary_Pcs set  BalKgs = Case When IsNull(DelKgs,0)>0   Then  (IsNull(DelKgs,0)-IsNull(REcKgs,0)  - IsNull(RRecKgs,0)+IsNull(Retkgs,0)) Else  (ReqKgs - IsNull(REcKgs,0)  - IsNull(RRecKgs,0)+IsNull(Retkgs,0)) End  where guid=@guid  and Deptid <> 1 And (Select Distinct IsNull(ProdDept,'N') From Mas_JobWrkComp Inner Join Tmp_OCRSummary_Pcs on Tmp_OCRSummary_Pcs.DeptId = Mas_JobWrkComp.Id Inner Join Mas_dept on Mas_dept.DeptID = Mas_JobWrkComp.DeptId Where Mas_JobWrkComp.Id=Tmp_OCRSummary_Pcs.DeptId and IsNull(ProdDept,'N')='Y')='Y' 






--update Tmp_OCRSummary_Pcs set  BalKgs = Case When IsNull(DelKgs,0)>0 and IsNull(InhouseProdPcs,0)>0  Then  (IsNull(DelKgs,0)-IsNull(REcKgs,0)  - IsNull(RRecKgs,0)+(IsNull(ReqKgs,0)-IsNull(InhouseProdPcs,0))) Else Case When IsNull(DelKgs,0)>0 and IsNull(InhouseProdPcs,0)=0 Then (IsNull(DelKgs,0)-IsNull(REcKgs,0)  - IsNull(RRecKgs,0))   Else (ReqKgs - IsNull(REcKgs,0)  - IsNull(RRecKgs,0)-IsNull(InhouseProdPcs,0)) End End where guid=@guid  and Deptid <> 1 And (Select Distinct IsNull(ProdDept,'N') From Mas_JobWrkComp Inner Join Tmp_OCRSummary_Pcs on Tmp_OCRSummary_Pcs.DeptId = Mas_JobWrkComp.Id Inner Join Mas_dept on Mas_dept.DeptID = Mas_JobWrkComp.DeptId Where Mas_JobWrkComp.Id=Tmp_OCRSummary_Pcs.DeptId and IsNull(ProdDept,'N')='Y')='Y'







update Tmp_OCRSummary_Pcs set  BalKgs =BalKgs + (Case When IsNull(DelKgs,0)>0 and IsNull(InhouseProdPcs,0)>0  Then  (IsNull(ReqKgs,0)-IsNull(DelKgs,0)-IsNull(InhouseProdPcs,0)) Else  Case When  IsNull(DelKgs,0)>0 and IsNull(InhouseProdPcs,0)=0  Then  0 Else (IsNull(DelKgs,0)-IsNull(InhouseProdPcs,0)) End End)  where guid=@guid  and Deptid <> 1 And (Select Distinct IsNull(ProdDept,'N') From Mas_JobWrkComp Inner Join Tmp_OCRSummary_Pcs on Tmp_OCRSummary_Pcs.DeptId = Mas_JobWrkComp.Id Inner Join Mas_dept on Mas_dept.DeptID = Mas_JobWrkComp.DeptId Where Mas_JobWrkComp.Id=Tmp_OCRSummary_Pcs.DeptId and IsNull(ProdDept,'N')='Y')='Y' 







update Tmp_OCRSummary_Pcs set  BalKgs = (ReqKgs-ISNULL(RecKgs,0)-ISNULL(DelKgs,0)-ISNULL(RRecKgs,0)-ISNULL(Retkgs,0))  where guid=@guid  and Deptid =0 And (Select Distinct IsNull(ProdDept,'N') From Mas_JobWrkComp Inner Join Tmp_OCRSummary_Pcs on Tmp_OCRSummary_Pcs.DeptId = Mas_JobWrkComp.Id Inner Join Mas_dept on Mas_dept.DeptID = Mas_JobWrkComp.DeptId Where Mas_JobWrkComp.Id=Tmp_OCRSummary_Pcs.DeptId and IsNull(ProdDept,'N')='Y')='Y' 







/* update Tmp_OCRSummary set  BalKgs =@CutDelPcs - REcKgs  where isnull(delkgs,0)>0 and guid=@guid  and Deptid = 11 */  







--Nasi



--update Tmp_OCRSummary_Pcs set  BalKgs = (ReqKgs - IsNull(REcKgs,0) + IsNull(RDelKgs,0) - IsNull(RRecKgs,0)) where guid=@guid  and Deptid = 1 



update Tmp_OCRSummary_Pcs set  BalKgs = (ReqKgs - IsNull(REcKgs,0) + IsNull(RDelKgs,0) - IsNull(RRecKgs,0)-IsNull(InhouseProdPcs,0)) where guid=@guid  and Deptid = 1 







update Tmp_OCRSummary_Pcs set  BalKgs =(ReqKgs - IsNull(DelKgs,0))  where guid=@guid  and Deptid = 0 







update Tmp_OCRSummary set  BalKgs =(ReqKgs - IsNull(DelKgs,0))  where guid=@guid  and Deptid = 0 







update Tmp_OCRSummary set  lossper = case when DelKgs > 0 then ((BalKgs/DelKgs)*100) ELSE 0 End Where isnull(delkgs,0)>0 and guid=@guid   and Deptid <> 11 and Deptid >=4 And (Select IsNull(ProdDept,'N') From Mas_Dept Where Mas_Dept.DeptId=Tmp_OCRSummary.DeptId)='N'  







--Nasi











--update Tmp_OCRSummary_Pcs set  lossper = case when ReqKgs > 0 then ((BalKgs/ReqKgs)*100) ELSE 0 End Where guid=@guid   and Deptid <> 1 And (Select IsNull(ProdDept,'N') From Mas_Dept Where Mas_Dept.DeptId=Tmp_OCRSummary_Pcs.DeptId)='Y'  







update Tmp_OCRSummary_Pcs set  lossper = case when ReqKgs > 0 then ((BalKgs/ReqKgs)*100) ELSE 0 End Where guid=@guid   and Deptid <> 1 And (Select IsNull(ProdDept,'N') From Mas_JobWrkComp INNER JOIN Mas_Dept ON Mas_Dept.DeptId=Mas_JobWrkComp.DeptId Where 
Mas_JobWrkComp.Id=Tmp_OCRSummary_Pcs.DeptId)='Y'  











/* update Tmp_OCRSummary set  lossper = CASE WHEN CutDelPcs > 0 Then ((BalKgs/CutDelPcs)*100) ELSE 0 END where isnull(delkgs,0)>0 and guid=@guid   and Deptid = 11 */  











update Tmp_OCRSummary_Pcs set  lossper = CASE WHEN ReqKgs > 0 Then ((BalKgs/ReqKgs)*100) ELSE 0 END where guid=@guid   and Deptid = 1  



update Tmp_OCRSummary set  lossper = CASE WHEN ReqKgs > 0 Then ((BalKgs/ReqKgs)*100) ELSE 0 END where guid=@guid   and Deptid = 0 



--update Tmp_OCRSummary_Pcs set  BalKgs=0 ,lossper=0 where deptname ='Depatched' and guid=@guid     







update Tmp set DeptSlno= OrderSno from Tmp_OCRSummary Tmp inner join MAs_dEpt M_dept on Tmp.deptid=M_dept.deptid where isnull(deptslno,0)=0    







/* Accessory Information*/    



/*create table Tmp_OCR_AccSummary(guid varchar(256),Ordid int,AccTypeId int,AccdescId int,Colid int,Sizeid int,AccType varchar(50),AccDesc varchar(100),Colordesc varchar(200),SizeDesc varchar(20),ReqQty numeric(18,3) default 0 ,PoQty numeric(18,3) defaul



t



0,GRNQty numeric(18,3) default 0,IssQty numeric(18,3) default 0,BalQty numeric(18,3) default 0)*/    



  --By Menaka



--insert into Tmp_OCR_AccSummary(guid,Ordid,AccTypeId ,AccdescId ,colid,Sizeid ,ReqQty)     



--select @guid,Ordid,Acc_Type,Acc_Desc,Clr,Siz,sum(ReqdQty) from PRO_AccReq  where ordid=@Ordid group by Ordid,Acc_Type,Acc_Desc,Clr,Siz 







insert into Tmp_OCR_AccSummary(guid,Ordid,AccTypeId ,AccdescId ,colid,Sizeid ,ReqQty,OrdQty,Excess) select @guid,Ordid,Acc_Type,Acc_Desc,Clr,Siz,sum(ReqdQty)as ReqQty,Sum(PRO_AccReq.OrdQty) AS OrdQty,avg(PRO_AccReq.Excess) as Excess from PRO_AccReq  where
 ordid=@Ordid group by Ordid,Acc_Type,Acc_Desc,Clr,Siz  







update tmp set tmp.PoQty= x.PoQty from (Select Ordid,Atype,Ades,Clr,Siz,Sum(PoQty) as PoQty from trs_po5 where ordid =@Ordid group by Ordid,Atype,Ades,Clr,Siz ) x inner join   Tmp_OCR_AccSummary Tmp on X.ordid=Tmp.ordid and X.Atype=Tmp.AccTypeId and X.Ades=Tmp.AccdescId and X.clr=Tmp.colid and X.siz=Tmp.sizeid and tmp.Guid=@guid    







update tmp set tmp.GRNQty= x.REcQty from (Select Dtl.Ordid,Atype,Ades,Stk.ColID as Clr,Siz,Sum(Recmtr) as REcQty from trs_grn1 MAs inner join TRs_grn2 dtl on MAs.id=Dtl.id inner join Stocktable Stk on Dtl.Stockid=stk.stockid  where Grntype='Acc.Purch' and
  Dtl.ordid =@Ordid  group by Dtl.Ordid,Atype,Ades,stk.colid,Siz ) x inner join   Tmp_OCR_AccSummary Tmp on X.ordid=Tmp.ordid and X.Atype=Tmp.AccTypeId and X.Ades=Tmp.AccdescId and X.clr=Tmp.colid and X.siz=Tmp.sizeid and tmp.Guid=@guid    











/*issue return */  







update tmp set tmp.Retkgs= x.REcQty from (Select Dtl.Ordid,Atype,Ades,Stk.ColID as Clr,Siz,Sum(Recmtr) as REcQty from trs_grn1 MAs inner join TRs_grn2 dtl on MAs.id=Dtl.id inner join  Stocktable Stk on Dtl.Stockid=stk.stockid  where Grntype='Acc.Iss.Ret' 
and  Dtl.ordid =@Ordid  group by Dtl.Ordid,Atype,Ades,stk.colid,Siz ) x inner join   Tmp_OCR_AccSummary Tmp on X.ordid=Tmp.ordid and X.Atype=Tmp.AccTypeId and X.Ades=Tmp.AccdescId and X.clr=Tmp.colid and X.siz=Tmp.sizeid and tmp.Guid=@guid  











/*TRansfer In */    



/*update Tmp_OCR_AccSummary set TranInKgs = x.TRanInKg from     (select TranOrdID as ORdid ,PRs_dePt,sum(mtr) as TRanInKg from trs_del1 MAs(nolock) inner join  trS_del2 dtl(nolock) on MAs.id=Dtl.id where trtype=8 and  TranOrdID= @Ordid group by TranOrdID  ,PRs_dePt ) x     */
update Tmp_OCR_AccSummary set TranInKgs = x.TRanInKg from     (select TranOrdID as ORdid ,PRs_dePt,sum(Kg) as TRanInKg,Atype,Ades,Stk.ColID as Clr,Siz from trs_del1 MAs(nolock) inner join  trS_del2 dtl(nolock) on MAs.id=Dtl.id inner join Stocktable Stk on Dtl.Stockid=stk.stockid where trtype=8 and  TranOrdID= @Ordid group by TranOrdID  ,PRs_dePt ,Atype,Ades,Stk.ColID ,Siz) x  INNER JOIN Tmp_OCR_AccSummary ON Tmp_OCR_AccSummary.Ordid=X.ORdid and Tmp_OCR_AccSummary.AccTypeId=X.Atype and  Tmp_OCR_AccSummary.AccdescId=X.Ades and Tmp_OCR_AccSummary.Sizeid=X.Siz  Where Tmp_OCR_AccSummary.OrdId=@Ordid and Tmp_OCR_AccSummary.Guid=@guid  



/*TRansfer Out */ 




/*update Tmp_OCR_AccSummary set TranOutKgs = x.TRanOutKg from     (select OrdID as ORdid ,PRs_dePt,sum(mtr) as TRanOutKg from trs_del1 MAs(nolock) inner join  trS_del2 dtl(nolock) on MAs.id=Dtl.id where trtype=8 and OrdID= @Ordid group by OrdID  ,PRs_dePt ) x     */
update Tmp_OCR_AccSummary set TranOutKgs = x.TRanOutKg from     (select dtl.OrdID as ORdid ,PRs_dePt,sum(Kg) as TRanOutKg,Atype,Ades,Stk.ColID as Clr,Siz from trs_del1 MAs(nolock) inner join  trS_del2 dtl(nolock) on MAs.id=Dtl.id inner join Stocktable Stk on Dtl.Stockid=stk.stockid  where trtype=8 and dtl.OrdID= @Ordid group by dtl.OrdID  ,PRs_dePt ,Atype,Ades,Stk.ColID ,Siz) x     INNER JOIN Tmp_OCR_AccSummary ON Tmp_OCR_AccSummary.Ordid=X.ORdid and Tmp_OCR_AccSummary.AccTypeId=X.Atype and  Tmp_OCR_AccSummary.AccdescId=X.Ades and Tmp_OCR_AccSummary.Sizeid=X.Siz  Where Tmp_OCR_AccSummary.OrdId=@Ordid and Tmp_OCR_AccSummary.Guid=@guid  





/* Kirthiga On 09-Aug-2018 For Unit Transfer In And Out*/











/*Unit Transfer In*/







update Tmp_OCR_AccSummary set UnitTranInkgs = X.UnitTRanInKg from  (select dtl.TranOrdID as ORdid ,PRs_dePt,Atype,Ades,Stk.ColID as Clr,Siz,sum(mtr) as UnitTRanInKg from trs_del1 MAs(nolock) inner join  trS_del2 dtl(nolock) on MAs.id=Dtl.id inner join Stocktable Stk on Dtl.Stockid=stk.stockid where trtype=16 and  dtl.TranOrdID= @Ordid group by dtl.TranOrdID  ,PRs_dePt,Atype,Ades,Stk.ColID,Siz)X INNER JOIN Tmp_OCR_AccSummary ON Tmp_OCR_AccSummary.Ordid=X.ORdid and Tmp_OCR_AccSummary.AccTypeId=X.Atype and  Tmp_OCR_AccSummary.AccdescId=X.Ades and Tmp_OCR_AccSummary.Sizeid=X.Siz  Where Tmp_OCR_AccSummary.OrdId=@Ordid and Tmp_OCR_AccSummary.Guid=@guid  











/*Unit Transfer Out*/



update Tmp_OCR_AccSummary set UnitTranOutKgs = X.UnitTranOutKgs from  (select dtl.OrdId as ORdid ,PRs_dePt,Atype,Ades,Stk.ColID as Clr,Siz,sum(mtr) as UnitTranOutKgs from trs_del1 MAs(nolock) inner join  trS_del2 dtl(nolock) on MAs.id=Dtl.id inner join Stocktable Stk on Dtl.Stockid=stk.stockid where trtype=16 and  dtl.OrdId= @Ordid group by dtl.OrdId  ,PRs_dePt,Atype,Ades,Stk.ColID,Siz)X INNER JOIN Tmp_OCR_AccSummary ON Tmp_OCR_AccSummary.Ordid=X.ORdid and Tmp_OCR_AccSummary.AccTypeId=X.Atype and  Tmp_OCR_AccSummary.AccdescId=X.Ades and Tmp_OCR_AccSummary.Sizeid=X.Siz Where Tmp_OCR_AccSummary.OrdId=@Ordid and Tmp_OCR_AccSummary.Guid=@guid 











/*Acc.po.Return */    







--Nasima On 11-July-2018 (Po.Ret Kgs Updated All Acc.Desc -> Makes Wrong)



--update Tmp_OCR_AccSummary set poretkgs = x.accpokgs from   (select OrdID as ORdid ,PRs_dePt,sum(Kg) as accpokgs from trs_del1 MAs(nolock) inner join  trS_del2 dtl(nolock) on MAs.id=Dtl.id where trtype=6 and OrdID= @Ordid group by OrdID  ,PRs_dePt ) x 











update Tmp_OCR_AccSummary set poretkgs = x.accpokgs from   (select dtl.OrdID as ORdid ,PRs_dePt,StockTable.Atype,StockTable.Ades,sum(mtr) as accpokgs from trs_del1 MAs(nolock) inner join  trS_del2 dtl(nolock) on MAs.id=Dtl.id INNER JOIN StockTable ON StockTable.StockID=dtl.stockid where trtype=6 and dtl.OrdID= @Ordid group by dtl.OrdID  ,PRs_dePt,StockTable.Atype,StockTable.Ades)X  INNER JOIN Tmp_OCR_AccSummary ON Tmp_OCR_AccSummary.Ordid=X.ORdid and Tmp_OCR_AccSummary.AccTypeId=X.Atype and  Tmp_OCR_AccSummary.AccdescId=X.Ades  Where Tmp_OCR_AccSummary.OrdId=@OrdId







update tmp set tmp.IssQty= x.IssQty from (Select Dtl.Ordid,Atype,Ades,Stk.ColID as Clr,Siz,Sum(mtr) as IssQty from trs_del1 MAs inner join TRs_del2 dtl on MAs.id=Dtl.id inner join Stocktable Stk on Dtl.Stockid=stk.stockid  where Trtype =7 and   Dtl.ordid =
@Ordid  group by Dtl.Ordid,Atype,Ades,stk.colid,Siz ) x inner join     Tmp_OCR_AccSummary Tmp on X.ordid=Tmp.ordid and X.Atype=Tmp.AccTypeId and X.Ades=Tmp.AccdescId and X.clr=Tmp.colid and X.siz=Tmp.sizeid and tmp.Guid=@guid    


/* Process Issue*/

update tmp set tmp.PrsIssQty= x.PrsIssQty from (Select Dtl.Ordid,Atype,Ades,Stk.ColID as Clr,Siz,Sum(mtr) as PrsIssQty from trs_del1 MAs inner join TRs_del2 dtl on MAs.id=Dtl.id inner join Stocktable Stk on Dtl.Stockid=stk.stockid  where Trtype =10 and   Dtl.ordid =
@Ordid group by Dtl.Ordid,Atype,Ades,stk.colid,Siz ) x inner join     Tmp_OCR_AccSummary Tmp on X.ordid=Tmp.ordid and X.Atype=Tmp.AccTypeId and X.Ades=Tmp.AccdescId and X.clr=Tmp.colid and X.siz=Tmp.sizeid and tmp.Guid=@guid  


/* Process Return */


update tmp set tmp.PrsIssRetQty= x.PrsIssRetQty from (Select Dtl.Ordid,Atype,Ades,Stk.ColID as Clr,Siz,Sum(Recmtr) as PrsIssRetQty from trs_grn1 MAs inner join TRs_grn2 dtl on MAs.id=Dtl.id inner join  Stocktable Stk on Dtl.Stockid=stk.stockid  where Grntype='Acc.Proc.Return' 
and  Dtl.ordid =@Ordid  group by Dtl.Ordid,Atype,Ades,stk.colid,Siz ) x inner join   Tmp_OCR_AccSummary Tmp on X.ordid=Tmp.ordid and X.Atype=Tmp.AccTypeId and X.Ades=Tmp.AccdescId and X.clr=Tmp.colid and X.siz=Tmp.sizeid and tmp.Guid=@guid  



/* Shortage */ --Nasima 











Update Tmp_OCR_AccSummary Set ShortageKgs =X.ShortageKgs From (SElect OrdID,Dept,ades,atype,ColID,asiz,IsNull(Sum(ShortMtr),0) as ShortageKgs  From Trs_Shortage Where Dept In (0,17) Group By OrdID,Dept,ades,atype,ColID,asiz )X INNER JOIN Tmp_OCR_AccSummary ON Tmp_OCR_AccSummary.Ordid=X.OrdID and Tmp_OCR_AccSummary.AccTypeId=X.atype and Tmp_OCR_AccSummary.AccdescId=X.ades and Tmp_OCR_AccSummary.Sizeid=X.asiz  and Tmp_OCR_AccSummary.Colid=X.ColID  Where  Tmp_OCR_AccSummary.guid=@guid and Tmp_OCR_AccSummary.Ordid=@Ordid



/*update Tmp_OCR_AccSummary set BalQty = GRNQty-IssQty  where GRNQty >0    */
/* Test */

update Tmp_OCR_AccSummary set BalQty = (GRNQty + isnull(TranInkgs,0) +  isnull(opening,0) + IsNull(PrsIssRetQty,0) ) - (IssQty + IsNull(PrsIssQty,0) + IsNull(TranOutKgs,0))  where GRNQty >0    




update  Tmp set tmp.AccType= Acc_Descr from Tmp_OCR_AccSummary tmp inner join MAs_acc Mas on tmp.Acctypeid=MAs.id    



update  Tmp set tmp.AccDesc= AccDescription from Tmp_OCR_AccSummary tmp inner join Mas_AccDes Mas on tmp.AccdescId=MAs.id    



update  Tmp set tmp.Colordesc= MAs.Colordesc from Tmp_OCR_AccSummary tmp inner join MAs_color Mas on tmp.Colid=MAs.colid    



update  Tmp set tmp.SizeDesc= Mas.SizeDesc from Tmp_OCR_AccSummary tmp inner join MAs_size Mas on tmp.Sizeid=MAs.sizeid    



set nocount  off;    



End    
