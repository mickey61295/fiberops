/*;=============================================   
; Author           :  Global Software's    
; Create date      :  22/05/2023 
; Create By        :  chandru  
; Description      :  QUERY
; Change Person    :  chandru
; Last Change Date :  24/01/2024 01.36 AM 
; =============================================  */  
     
 Create PROCEDURE sp_Collar (@Ordid as int,@Dept as int ) as 

  

  select distinct @Dept as dept,x.Fabdesc,x.colordesc,sum(x.Reqkgs) as Reqkgs ,sum(x.grnkgs)+sum(Prsgrnkgs)  as grn,sum(x.openkgs) as openingkgs,sum(PrsDc)- Sum(prsret) as PrsDc,sum(Trnsin) as Trnsin ,sum(transout) as transout,sum(stockkgs) as stockkgs ,sum(issuekgs)-sum(issret)-sum(cutret) as issuekgs,Receivngdept,sum(reprsdc)-sum(reprsret) as reprsdc,sum(reprsrec) as reprsrec,
  sum(reprsdc)+sum(PrsDc)-sum(reprsret)-Sum(prsret)-sum(reprsrec)-sum(Prsgrnkgs) as reprsbalance,recdeptid,@Ordid as ordid,0 as slno,'Y'   from(  



  

 select distinct Mas_Fabric.Fabdesc   ,isnull(ColorDesc,'') as ColorDesc , (Pro_ReqKnitt.ReqMtr) as Reqkgs,0 as grnkgs,0 as Prsgrnkgs,0 as Trnsin,0 as transout,0 as openkgs,0 as stockkgs    ,0 as issuekgs,'' as Receivngdept  ,0 as issret,0  as reprsdc ,0 as reprsrec,0 as reprsret ,0 as recdeptid ,0  as cutret, 0 as PrsDc ,0 as prsret      from Ordermas inner join Pro_ReqKnitt on Pro_ReqKnitt.Ordid = OrderMas.OrdId    left outer join Mas_color on    Pro_ReqKnitt.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = Pro_ReqKnitt.FabId   where ordermas.ordid =@Ordid and Deptid  in (@Dept)  and Mas_fabric.PriUomID in (2,5) group by Fabdesc ,ColorDesc,ReqMtr 



    	union all

		

			select distinct  Mas_Fabric.Fabdesc,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,isnull(sum(Trs_grn2.Recmtr),0) as  grnkgs, 0 as Prsgrnkgs,0 as Trnsin,0  as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept ,0 as issret,0  as reprsdc ,0 as reprsrec,0 as reprsret ,0 as recdeptid ,0  as cutret, 0 as PrsDc,0 as prsret     from Ordermas inner join Trs_grn2 on Trs_GRN2.ordid = Ordermas.OrdId  inner join stocktable on stocktable.StockID =trs_grn2.StockID  inner join trs_grn1 on trs_grn2.id = trs_grn1.ID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID where ordermas.OrdId=@Ordid and StockTable.Dept in(@Dept)  and trs_grn1.GRNType = 'Purchase'  and Mas_fabric.PriUomID in (2,5)  group by Fabdesc,ColorDesc,Trs_grn2.RecKgs



	union all



	select distinct  Mas_Fabric.Fabdesc,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as  grnkgs, isnull(sum(Trs_grn2.Recmtr ),0) as Prsgrnkgs,0 as Trnsin,0  as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept ,0 as issret,0  as reprsdc ,0 as reprsrec,0 as reprsret,0 as recdeptid ,0  as cutret , 0 as PrsDc,0 as prsret      from Ordermas inner join  Trs_grn2 on Trs_GRN2.ordid = OrderMas.OrdId  inner join stocktable on stocktable.StockID =trs_grn2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID  inner join trs_grn1 on trs_grn1.id =  trs_grn2.id left outer join Mas_Fabric
 on Mas_Fabric.FabID = stocktable.FabID  where ordermas.OrdId=@Ordid and Trs_Grn1.Dept   in(@Dept) and trs_grn1.GRNType = 'Process'  and processtype ='P'  and Mas_fabric.PriUomID in (2,5)  group by Fabdesc,ColorDesc



	  union all 	



	 select distinct  Mas_Fabric.Fabdesc,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as  grnkgs, 0 as Prsgrnkgs,  sum(Trs_Del2.mtr) as Trnsin,0  as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept  ,0 as issret ,0  as reprsdc ,0 as reprsrec,0 as reprsret ,0 as recdeptid ,0  as cutret, 0 as PrsDc ,0 as prsret     from Ordermas inner join Trs_Del2 on Trs_Del2.ordid = OrderMas.OrdId  inner join trs_del1 on trs_del2.id = trs_del1.ID inner join stocktable on stocktable.StockID =Trs_Del2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID where Trs_del2.TranOrdID=@Ordid and Trs_Del1.Prs_Dept in (@Dept)  and trs_del1.TrType = 3  and Mas_fabric.PriUomID in (2,5) group by

 Fabdesc,ColorDesc,Trs_Del2.Kg 



 union all

 

	 select distinct  Mas_Fabric.Fabdesc,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as  grnkgs, 0 as Prsgrnkgs,  0 as Trnsin,sum(Trs_Del2.mtr)  as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept ,0 as issret ,0  as reprsdc ,0 as reprsrec,0 as reprsret ,0 as recdeptid ,0  as cutret , 0 as PrsDc,0 as prsret     from Ordermas inner join Trs_Del2 on Trs_Del2.ordid = OrderMas.OrdId  inner join trs_del1 on trs_del2.id = trs_del1.ID inner join stocktable on stocktable.StockID =Trs_Del2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID where Trs_del2.OrdId=@Ordid and Trs_Del1.Prs_Dept  in (@Dept) and trs_del1.TrType = 3  and Mas_fabric.PriUomID in (2,5)  group by Fabdesc,ColorDesc,Trs_Del2.Kg   

	  



 union all 





	       select distinct  Mas_Fabric.Fabdesc as CountName,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,0  as Trnsin,0 as transout,sum(Trs_Opening.MtrPc) as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept  ,0 as issret,0  as reprsdc ,0 as reprsrec,0 as reprsret ,0 as recdeptid ,0  as cutret, 0 as PrsDc ,0 as prsret    from Ordermas inner join Trs_Opening on Trs_Opening.ordid = OrderMas.OrdId  inner join  stocktable on stocktable.StockID =Trs_Opening.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID where Trs_Opening.OrdID=@Ordid and Trs_Opening.Dept  in(@Dept)  and stocktable.dept  in(@Dept)   and Mas_fabric.PriUomID in (2,5)  group by Mas_Fabric.Fabdesc,ColorDesc,Trs_Opening.Kgs 







union all



select distinct  Mas_Fabric.Fabdesc as CountName,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,0  as Trnsin,0 as transout,0 as openkgs, sum(Currentstock.Mt)   as stockkgs,0 as issuekgs,'' as Receivngdept ,0 as issret,0  as reprsdc ,0 as reprsrec,0 as reprsret   ,0 as recdeptid,0  as cutret , 0 as PrsDc  ,0 as prsret     from Ordermas left join Currentstock on Currentstock.ordid = OrderMas.OrdId  left join stocktable on stocktable.StockID =Currentstock.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID where Currentstock.OrdId=@Ordid   and stocktable.dept in(@Dept)   and Mas_fabric.PriUomID in (2,5) group by Fabdesc,ColorDesc,Currentstock.Kg



 	union all 	

	

	       select   Mas_Fabric.Fabdesc,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,0  as Trnsin,0 as transout,0 as openkgs,0  as stockkgs,sum(Trs_del2.mtr) as issuekgs,'' as Receivngdept ,0 as issret,0  as reprsdc ,0 as reprsrec,0 as reprsret ,0 as recdeptid ,0  as cutret , 0 as PrsDc,0 as prsret     from Ordermas inner join Trs_Del2 on Trs_Del2.ordid = OrderMas.OrdId  inner join trs_del1 on trs_del2.id = trs_del1.ID inner join stocktable on stocktable.StockID =Trs_Del2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID inner join Mas_Dept on Mas_Dept.DeptID =Trs_Del1.Prs_Dept  where ordermas.OrdId=@Ordid and StockTable.Dept    in(@Dept) and ProcessType ='P' and TrType = 1   and Mas_fabric.PriUomID in (2,5)  group by Mas_Fabric.Fabdesc,ColorDesc
,Trs_Del2.Kg



union all



   select   Mas_Fabric.Fabdesc,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,0  as Trnsin,0 as transout,0 as openkgs,0  as stockkgs,sum(Trs_del2.mtr) as issuekgs,Mas_Dept.Deptname  as Receivngdept ,0 as issret ,0  as reprsdc ,0 as reprsrec,0 as reprsret,Mas_Dept.DeptID as recdeptid ,0  as cutret, 0 as PrsDc,0 as prsret      from Ordermas inner join Trs_Del2 on Trs_Del2.ordid = OrderMas.OrdId  inner join trs_del1 on trs_del2.id = trs_del1.ID inner join stocktable on stocktable.StockID =Trs_Del2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID inner join Mas_Dept on Mas_Dept.DeptID =Trs_Del1.Prs_Dept  where ordermas.OrdId=@Ordid and StockTable.Dept    in(@Dept) and ProcessType ='P' and TrType = 1   and Mas_fabric.PriUomID in (2,5) group by Mas_Fabric.Fabdesc
,ColorDesc,Trs_Del2.Kg,Deptname,Mas_Dept.DeptID


union all

		select distinct  Mas_Fabric.Fabdesc,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as  grnkgs, 0 as Prsgrnkgs,0 as Trnsin,0  as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept,isnull(sum(Trs_grn2.Recmtr ),0) as issret,0  as reprsdc ,0 as reprsrec,0 as reprsret ,0 as recdeptid,0  as cutret, 0 as PrsDc,0 as prsret     from Ordermas inner join Trs_grn2 on Trs_GRN2.ordid = Ordermas.OrdId  inner join stocktable on stocktable.StockID =trs_grn2.StockID  inner join trs_grn1 on trs_grn2.id = trs_grn1.ID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID where ordermas.OrdId=@Ordid and StockTable.Dept in(@Dept)  and trs_grn1.GRNType = 'Process Return'  and Mas_fabric.PriUomID in (2,5)   group by Fabdesc,ColorDesc,Trs_grn2.RecKgs

union all

select distinct  Mas_Fabric.Fabdesc,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as  grnkgs, 0 as Prsgrnkgs,0 as Trnsin,0  as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,Mas_Dept.Deptname  as Receivngdept,isnull(sum(Trs_grn2.Recmtr ),0) as issret,0  as reprsdc ,0 as reprsrec,0 as reprsret,Mas_Dept.DeptID as recdeptid,0  as cutret, 0 as PrsDc,0 as prsret      from Ordermas inner join Trs_grn2 on Trs_GRN2.ordid = Ordermas.OrdId  inner join stocktable on stocktable.StockID =trs_grn2.StockID  inner join trs_grn1 on trs_grn2.id = trs_grn1.ID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID inner join Mas_Dept on Mas_Dept.DeptID = Trs_Grn1.Dept  where ordermas.OrdId=@Ordid and StockTable.Dept in(@Dept)  and trs_grn1.GRNType = 'Process Return'  and Mas_fabric.PriUomID in (2,5)   group by Fabdesc,ColorDesc,Trs_grn2.RecKgs,Mas_Dept.Deptname,Mas_Dept.DeptID
 


union all

   select distinct  Mas_Fabric.Fabdesc,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,0  as Trnsin,0 as transout,0 as openkgs,0  as stockkgs,sum(Trs_ReadyToCut2.mtr) as issuekgs,Mas_Dept.Deptname  as Receivngdept ,0 as issret,0  as reprsdc ,0 as reprsrec,0 as reprsret,Mas_Dept.DeptID  as recdeptid,0  as cutret, 0 as PrsDc ,0 as prsret        from Ordermas inner join Trs_ReadyToCut2 on Trs_ReadyToCut2.ordid = OrderMas.OrdId  inner join Trs_ReadyToCut1 on Trs_ReadyToCut2.id = Trs_ReadyToCut1.ID inner join stocktable on stocktable.StockID =Trs_ReadyToCut2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID inner join Mas_Dept on Mas_Dept.DeptID =Trs_ReadyToCut1.Prs_Dept  where ordermas.OrdId=@Ordid and StockTable.Dept    in(@Dept) and  TrType = 20   and Mas_fabric.PriUomID in (2,5)  group by Mas_Fabric.Fabdesc
,ColorDesc,Trs_ReadyToCut2.Kg,Deptname,Mas_Dept.DeptID


union all

   select distinct  Mas_Fabric.Fabdesc,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,0  as Trnsin,0 as transout,0 as openkgs,0  as stockkgs,sum(Trs_ReadyToCut2.mtr) as issuekgs,'' as Receivngdept ,0 as issret,0  as reprsdc ,0 as reprsrec,0 as reprsret,0 as recdeptid  ,0  as cutret    , 0 as PrsDc,0 as prsret   from Ordermas inner join Trs_ReadyToCut2 on Trs_ReadyToCut2.ordid = OrderMas.OrdId  inner join Trs_ReadyToCut1 on Trs_ReadyToCut2.id = Trs_ReadyToCut1.ID inner join stocktable on stocktable.StockID =Trs_ReadyToCut2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID inner join Mas_Dept on Mas_Dept.DeptID =Trs_ReadyToCut1.Prs_Dept  where ordermas.OrdId=@Ordid and StockTable.Dept    in(@Dept) and  TrType = 20   and Mas_fabric.PriUomID in (2,5)  group by Mas_Fabric.Fabdesc,ColorDesc,Trs_ReadyToCut2.Kg,Deptname

union all 

	       select distinct  Mas_Fabric.Fabdesc,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,0  as Trnsin,0 as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept ,0 as issret,sum(Trs_del2.mtr)  as reprsdc,0 as reprsrec,0 as reprsret,0 as recdeptid,0  as cutret    , 0 as PrsDc,0 as prsret     from Ordermas inner join Trs_Del2 on Trs_Del2.ordid = OrderMas.OrdId  inner join trs_del1 on trs_del2.id = trs_del1.ID inner join stocktable on stocktable.StockID =Trs_Del2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID inner join Mas_Dept on Mas_Dept.DeptID =Trs_Del1.Prs_Dept  where ordermas.OrdId=@Ordid and trs_del1.Prs_Dept    in(@Dept) and ProcessType ='R' and TrType = 1   and Mas_fabric.PriUomID in (2,5)  and Mas_Dept.InputType='F' and OutputType ='F' group by Mas_Fabric.Fabdesc,ColorDesc,DesignId

union all



	select distinct  Mas_Fabric.Fabdesc,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as  grnkgs, 0 as Prsgrnkgs,0 as Trnsin,0  as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept ,0 as issret,0  as reprsdc ,isnull(sum(Trs_grn2.Recmtr ),0) as reprsrec,0 as reprsret,0 as recdeptid,0  as cutret, 0 as PrsDc,0 as prsret         from Ordermas inner join  Trs_grn2 on Trs_GRN2.ordid = OrderMas.OrdId  inner join stocktable on stocktable.StockID =trs_grn2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID  inner join trs_grn1 on trs_grn1.id =  trs_grn2.id left outer join Mas_Fabric
 on Mas_Fabric.FabID = stocktable.FabID inner join Mas_Dept on Mas_Dept.DeptID = Trs_Grn1.Dept  where ordermas.OrdId=@Ordid and Trs_Grn1.Dept   in(@Dept) and trs_grn1.GRNType = 'Process' and processtype ='R'   and Mas_fabric.PriUomID in (2,5) and Mas_Dept.InputType='F' and OutputType ='F'   group by Fabdesc,ColorDesc

 union all


 select distinct  Mas_Fabric.Fabdesc,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as  grnkgs, 0 as Prsgrnkgs,0 as Trnsin,0  as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept ,0 as issret,0  as reprsdc ,0 as reprsrec,isnull(sum(Trs_grn2.Recmtr),0) as reprsret,0 as recdeptid,0  as cutret  , 0 as PrsDc,0 as prsret     from Ordermas inner join  Trs_grn2 on Trs_GRN2.ordid = OrderMas.OrdId  inner join stocktable on stocktable.StockID =trs_grn2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID  inner join trs_grn1 on trs_grn1.id =  trs_grn2.id left outer join Mas_Fabric
 on Mas_Fabric.FabID = stocktable.FabID inner join Mas_Dept on Mas_Dept.DeptID = Trs_Grn1.Dept  where ordermas.OrdId=@Ordid and Trs_Grn1.Dept   in(@Dept) and trs_grn1.GRNType = 'Process Return' and processtype ='R'   and Mas_fabric.PriUomID in (2,5)  and Mas_Dept.InputType='F' and OutputType ='F'    group by Fabdesc,ColorDesc

 union all
  
  select distinct  Mas_Fabric.Fabdesc,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,0  as Trnsin,0 as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,Mas_Dept.Deptname  as Receivngdept ,0 as issret ,0  as reprsdc ,0 as reprsrec,0 as reprsret,Mas_Dept.DeptID as recdeptid,sum(Trs_del2.mtr) as cutret, 0 as PrsDc,0 as prsret      from Ordermas inner join Trs_Del2 on Trs_Del2.ordid = OrderMas.OrdId  inner join trs_del1 on trs_del2.id = trs_del1.ID inner join stocktable on stocktable.StockID =Trs_Del2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID inner join Mas_Dept on Mas_Dept.DeptID =Trs_Del1.Prs_Dept  where ordermas.OrdId=@Ordid and StockTable.Dept    in(@Dept) and DELTYPE  ='R' and TrType = -2 and isnull(AKg,0) <> 0    and Mas_fabric.PriUomID in (2,5)  group by Mas_Fabric.Fabdesc,ColorDesc,Trs_Del2.Kg,Deptname,Mas_Dept.DeptID

  union all

	       select distinct  Mas_Fabric.Fabdesc,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,0  as Trnsin,0 as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept ,0 as issret,0 as reprsdc,0 as reprsrec,0 as reprsret,0 as recdeptid,0  as cutret,sum(Trs_del2.mtr) as PrsDc,0 as prsret        from Ordermas inner join Trs_Del2 on Trs_Del2.ordid = OrderMas.OrdId  inner join trs_del1 on trs_del2.id = trs_del1.ID inner join stocktable on stocktable.StockID =Trs_Del2.StockID   left outer join Mas_color on  trs_del1.DyeColId   = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID inner join Mas_Dept on Mas_Dept.DeptID =Trs_Del1.Prs_Dept  where ordermas.OrdId=@Ordid and trs_del1.Prs_Dept    in(@Dept) and ProcessType ='P' and TrType = 1   and Mas_fabric.PriUomID in (2,5) and Mas_Dept.InputType='F' and OutputType ='F' and Mas_Dept.DeptID  =8 group by Mas_Fabric.Fabdesc,ColorDesc,DesignId

		   union all


		       select distinct  Mas_Fabric.Fabdesc,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,0  as Trnsin,0 as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept ,0 as issret,0 as reprsdc,0 as reprsrec,0 as reprsret,0 as recdeptid,0  as cutret,sum(Trs_del2.mtr) as PrsDc,0 as prsret      from Ordermas inner join Trs_Del2 on Trs_Del2.ordid = OrderMas.OrdId  inner join trs_del1 on trs_del2.id = trs_del1.ID inner join stocktable on stocktable.StockID =Trs_Del2.StockID   left outer join Mas_color on  StockTable.ColID   = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID inner join Mas_Dept on Mas_Dept.DeptID =Trs_Del1.Prs_Dept  where ordermas.OrdId=@Ordid and trs_del1.Prs_Dept    in(@Dept) and ProcessType ='P' and TrType = 1   and Mas_fabric.PriUomID in (2,5)  and Mas_Dept.InputType='F' and OutputType ='F' and Mas_Dept.DeptID  not in (8,4) group by Mas_Fabric.Fabdesc,ColorDesc,DesignId

			   union all

			    select distinct  Mas_Fabric.Fabdesc,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as  grnkgs, 0 as Prsgrnkgs,0 as Trnsin,0  as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept ,0 as issret,0  as reprsdc ,0 as reprsrec,0 as reprsret,0 as recdeptid,0  as cutret  , 0 as PrsDc  ,isnull(sum(Trs_grn2.Recmtr),0) as prsret from Ordermas inner join  Trs_grn2 on Trs_GRN2.ordid = OrderMas.OrdId  inner join trs_grn1 on trs_grn1.id =  trs_grn2.id inner join stocktable on stocktable.StockID =trs_grn2.StockID  left outer join Trs_Del1  on Trs_Del1.ID = Trs_Grn1.DCID   left outer join Mas_color on    Trs_Del1.DyeColId = Mas_Color.ColID  left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID inner join Mas_Dept on Mas_Dept.DeptID = Trs_Grn1.Dept  where ordermas.OrdId=@Ordid and Trs_Grn1.Dept   in(@Dept) and trs_grn1.GRNType = 'Process Return' and Trs_Grn1.processtype ='P'   and Mas_fabric.PriUomID in (2,5) and Mas_Dept.InputType='F' and OutputType ='F' and Mas_Dept.DeptID  =8     group by Fabdesc,ColorDesc

union all

  select distinct  Mas_Fabric.Fabdesc,isnull(ColorDesc,'') as ColorDesc,0 as Reqkgs,0 as  grnkgs, 0 as Prsgrnkgs,0 as Trnsin,0  as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept ,0 as issret,0  as reprsdc ,0 as reprsrec,0 as reprsret,0 as recdeptid,0  as cutret  , 0 as PrsDc,isnull(sum(Trs_grn2.Recmtr),0) as prsret   from Ordermas inner join  Trs_grn2 on Trs_GRN2.ordid = OrderMas.OrdId  inner join trs_grn1 on trs_grn1.id =  trs_grn2.id inner join stocktable on stocktable.StockID =trs_grn2.StockID    left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID  left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID inner join Mas_Dept on Mas_Dept.DeptID = Trs_Grn1.Dept  where ordermas.OrdId=@Ordid and Trs_Grn1.Dept   in(@Dept) and trs_grn1.GRNType = 'Process Return' and Trs_Grn1.processtype ='P'  and Mas_fabric.PriUomID in (2,5) and Mas_Dept.InputType='F' and OutputType ='F'    and Mas_Dept.DeptID  not in  (8,4)   group by Fabdesc,ColorDesc

 )x group by Fabdesc,ColorDesc,Receivngdept,recdeptid



