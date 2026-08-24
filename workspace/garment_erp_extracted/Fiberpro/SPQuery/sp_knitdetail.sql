/*;=============================================   
; Author           :  Global Software's    
; Create date      :  22/05/2023 
; Create By        :  chandru  
; Description      :  QUERY
; Change Person    :  chandru
; Last Change Date :  01/12/2023 10.36 AM 
; =============================================  */  
     
Create PROCEDURE sp_knitdetail (@Ordid as int,@Dept as int ) as 
  

  select distinct @Dept as dept,x.Fabdesc,x.colordesc,sum(x.Reqkgs) as Reqkgs ,sum(x.grnkgs)as grn,sum(x.openkgs) as openingkgs,sum(Prsgrnkgs) as Prsgrnkgs ,sum(Trnsin) as Trnsin ,sum(transout) as transout,sum(stockkgs) as stockkgs ,sum(issuekgs)-sum(issret) as issuekgs,Receivngdept,0 as reprsdc ,0 as reprsrec ,0 as reprsbalance ,recdeptid as recdeptid   from(  



  

 select distinct Mas_Fabric.Fabdesc,isnull(Mas_Design.DesignDesc,'') as ColorDesc, (Pro_ReqKnitt.reqkgs) as Reqkgs,0 as grnkgs,0 as Prsgrnkgs,0 as Trnsin,0 as transout,0 as openkgs,0 as stockkgs    ,0 as issuekgs,'' as Receivngdept  ,0 as issret,0 as recdeptid      from Ordermas inner join Pro_ReqKnitt on Pro_ReqKnitt.Ordid = OrderMas.OrdId   left outer join Mas_Design on Mas_Design.DesignId = Pro_ReqKnitt.DesignId  left outer join Mas_color on    Pro_ReqKnitt.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = Pro_ReqKnitt.FabId inner join Mas_Dept on Mas_Dept.deptid = Pro_ReqKnitt.DeptId    where ordermas.ordid =@Ordid and Pro_ReqKnitt.DeptId  in (@Dept)/* and Mas_fabric.PriUomID <> 2*/ group by Fabdesc ,ColorDesc,reqkgs ,Mas_Dept.grp,isnull(Mas_Design.DesignDesc,'') 
 



    	union all

		

			select distinct Mas_Fabric.Fabdesc,isnull(Mas_Design.DesignDesc,'') as ColorDesc,0 as Reqkgs,isnull(sum(Trs_grn2.RecKgs),0) as  grnkgs, 0 as Prsgrnkgs,0 as Trnsin,0  as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept ,0 as issret,0 as recdeptid    from Ordermas inner join Trs_grn2 on Trs_GRN2.ordid = Ordermas.OrdId  inner join stocktable on stocktable.StockID =trs_grn2.StockID  inner join trs_grn1 on trs_grn2.id = trs_grn1.ID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID left outer join Mas_Design on Mas_Design.DesignId = StockTable.PRINT_DESIGNID inner join Mas_Dept on Mas_Dept.DeptID = Trs_Grn1.Dept   where ordermas.OrdId=@Ordid and StockTable.Dept in(@Dept)  and trs_grn1.GRNType = 'Purchase'/* and Mas_fabric.PriUomID <> 2*/   group by Fabdesc,ColorDesc,Trs_grn2.RecKgs,Mas_Dept.grp,isnull(Mas_Design.DesignDesc,'') 



	union all



	select distinct Mas_Fabric.Fabdesc,isnull(Mas_Design.DesignDesc,'') as ColorDesc,0 as Reqkgs,0 as  grnkgs, isnull(sum(Trs_grn2.RecKgs),0) as Prsgrnkgs,0 as Trnsin,0  as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept ,0 as issret,0 as recdeptid     from Ordermas inner join
  Trs_grn2 on Trs_GRN2.ordid = OrderMas.OrdId  inner join stocktable on stocktable.StockID =trs_grn2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID  inner join trs_grn1 on trs_grn1.id =  trs_grn2.id left outer join Mas_Fabric
 on Mas_Fabric.FabID = stocktable.FabID left outer join Mas_Design on Mas_Design.DesignId = StockTable.PRINT_DESIGNID inner join Mas_Dept on Mas_Dept.DeptID = Trs_Grn1.Dept  where ordermas.OrdId=@Ordid and Trs_Grn1.Dept   in(@Dept) and trs_grn1.GRNType = 'Process'  /* and Mas_fabric.PriUomID <> 2*/   group by Fabdesc,ColorDesc,Mas_Dept.grp,isnull(Mas_Design.DesignDesc,'') 




	  union all 	



	 select distinct Mas_Fabric.Fabdesc,isnull(Mas_Design.DesignDesc,'') as ColorDesc,0 as Reqkgs,0 as  grnkgs, 0 as Prsgrnkgs,  sum(Trs_Del2.Kg) as Trnsin,0  as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept  ,0 as issret,0 as recdeptid      from Ordermas inner join Trs_Del2 on Trs_Del2.ordid = OrderMas.OrdId  inner join trs_del1 on trs_del2.id = trs_del1.ID inner join stocktable on stocktable.StockID =Trs_Del2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID left outer join Mas_Design on Mas_Design.DesignId = StockTable.PRINT_DESIGNID inner join Mas_Dept on Mas_Dept.DeptID = Trs_Del1.Prs_Dept 
 where Trs_del2.TranOrdID=@Ordid and Trs_Del1.Prs_Dept in (@Dept)  and trs_del1.TrType = 3/* and Mas_fabric.PriUomID <> 2*/ group by
  Fabdesc,ColorDesc,Trs_Del2.Kg ,Mas_Dept.grp,isnull(Mas_Design.DesignDesc,'') 



 union all

 

	 select distinct Mas_Fabric.Fabdesc,isnull(Mas_Design.DesignDesc,'') as ColorDesc,0 as Reqkgs,0 as  grnkgs, 0 as Prsgrnkgs,  0 as Trnsin,sum(Trs_Del2.Kg)  as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept ,0 as issret,0 as recdeptid      from Ordermas inner join Trs_Del2 on Trs_Del2.ordid = OrderMas.OrdId  inner join trs_del1 on trs_del2.id = trs_del1.ID inner join stocktable on stocktable.StockID =Trs_Del2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID left outer join Mas_Design on Mas_Design.DesignId = StockTable.PRINT_DESIGNID inner join Mas_Dept on Mas_Dept.DeptID = Trs_Del1.Prs_Dept 
 where Trs_del2.OrdId=@Ordid and Trs_Del1.Prs_Dept  in (@Dept) and trs_del1.TrType = 3/* and Mas_fabric.PriUomID <> 2*/ group by Fabdesc,ColorDesc,Trs_Del2.Kg ,Mas_Dept.grp,isnull(Mas_Design.DesignDesc,'')   

	  



 union all 





	       select distinct Mas_Fabric.Fabdesc,isnull(Mas_Design.DesignDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,0  as Trnsin,0 as transout,sum(Trs_Opening.Kgs) as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept  ,0 as issret,0 as recdeptid    from Ordermas inner join Trs_Opening on Trs_Opening.ordid = OrderMas.OrdId  inner join  stocktable on stocktable.StockID =Trs_Opening.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID left outer join Mas_Design on Mas_Design.DesignId = StockTable.PRINT_DESIGNID inner join Mas_Dept on Mas_Dept.DeptID = Trs_Opening.Dept
 where Trs_Opening.OrdID=@Ordid and Trs_Opening.Dept  in(@Dept)  and stocktable.dept  in(@Dept) /* and Mas_fabric.PriUomID <> 2*/ group by Mas_Fabric.Fabdesc,ColorDesc,Trs_Opening.Kgs ,Mas_Dept.grp,isnull(Mas_Design.DesignDesc,'')   







union all



select distinct Mas_Fabric.Fabdesc,isnull(Mas_Design.DesignDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,0  as Trnsin,0 as transout,0 as openkgs, sum(Currentstock.kg)   as stockkgs,0 as issuekgs,'' as Receivngdept ,0 as issret,0 as recdeptid        from Ordermas left join Currentstock on Currentstock.ordid = OrderMas.OrdId  left join stocktable on stocktable.StockID =Currentstock.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID left outer join Mas_Design on Mas_Design.DesignId = StockTable.PRINT_DESIGNID inner join Mas_Dept on Mas_Dept.DeptID = stocktable.Dept
 where Currentstock.OrdId=@Ordid   and stocktable.dept in(@Dept)  /* and Mas_fabric.PriUomID <> 2*/ group by Fabdesc,ColorDesc,Currentstock.Kg,Mas_Dept.grp,isnull(Mas_Design.DesignDesc,'')   



 	union all 	

	

	       select distinct Mas_Fabric.Fabdesc,isnull(Mas_Design.DesignDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,0  as Trnsin,0 as transout,0 as openkgs,0  as stockkgs,sum(Trs_del2.kg) as issuekgs,'' as Receivngdept ,0 as issret,0 as recdeptid     from Ordermas inner join Trs_Del2 on Trs_Del2.ordid = OrderMas.OrdId  inner join trs_del1 on trs_del2.id = trs_del1.ID inner join stocktable on stocktable.StockID =Trs_Del2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID left outer join Mas_Design on Mas_Design.DesignId = StockTable.PRINT_DESIGNID inner join Mas_Dept on Mas_Dept.DeptID =Trs_Del1.Prs_Dept  where ordermas.OrdId=@Ordid and StockTable.Dept    in(@Dept) and ProcessType ='P' and TrType = 1 /* and Mas_fabric.PriUomID <> 2*/  group by Mas_Fabric.Fabdesc,ColorDesc
,Trs_Del2.Kg,Mas_Dept.grp,isnull(Mas_Design.DesignDesc,'')  



union all



   select distinct  Mas_Fabric.Fabdesc,isnull(Mas_Design.DesignDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,0  as Trnsin,0 as transout,0 as openkgs,0  as stockkgs,sum(Trs_del2.kg) as issuekgs,Mas_Dept.Deptname  as Receivngdept ,0 as issret,Mas_Dept.DeptID as recdeptid     from Ordermas inner join Trs_Del2 on Trs_Del2.ordid = OrderMas.OrdId  inner join trs_del1 on trs_del2.id = trs_del1.ID inner join stocktable on stocktable.StockID =Trs_Del2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Design on Mas_Design.DesignId = StockTable.PRINT_DESIGNID  left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID inner join Mas_Dept on Mas_Dept.DeptID =Trs_Del1.Prs_Dept  where ordermas.OrdId=@Ordid and StockTable.Dept    in(@Dept) and ProcessType ='P' and TrType = 1 /* and Mas_fabric.PriUomID <> 2*/  group by Mas_Fabric.Fabdesc,Mas_Dept.DeptID
,ColorDesc,Trs_Del2.Kg,Deptname,Mas_Dept.grp,isnull(Mas_Design.DesignDesc,'')  


union all

		select distinct Mas_Fabric.Fabdesc,isnull(Mas_Design.DesignDesc,'') as ColorDesc,0 as Reqkgs,0 as  grnkgs, 0 as Prsgrnkgs,0 as Trnsin,0  as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,'' as Receivngdept,isnull(sum(Trs_grn2.RecKgs),0) as issret,0 as recdeptid   from Ordermas inner join Trs_grn2 on Trs_GRN2.ordid = Ordermas.OrdId  inner join stocktable on stocktable.StockID =trs_grn2.StockID  inner join trs_grn1 on trs_grn2.id = trs_grn1.ID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID left outer join Mas_Design on Mas_Design.DesignId = StockTable.PRINT_DESIGNID inner join Mas_Dept on Mas_Dept.DeptID = Trs_Grn1.Dept where ordermas.OrdId=@Ordid and StockTable.Dept in(@Dept)  and trs_grn1.GRNType = 'Process Return'/* and Mas_fabric.PriUomID <> 2*/   group by Fabdesc,ColorDesc,Trs_grn2.RecKgs,Mas_Dept.grp,isnull(Mas_Design.DesignDesc,'')  

union all

select distinct Mas_Fabric.Fabdesc,isnull(Mas_Design.DesignDesc,'') as ColorDesc,0 as Reqkgs,0 as  grnkgs, 0 as Prsgrnkgs,0 as Trnsin,0  as transout,0 as openkgs,0  as stockkgs,0 as issuekgs,Mas_Dept.Deptname  as Receivngdept,isnull(sum(Trs_grn2.RecKgs),0) as issret,Mas_Dept.DeptID as recdeptid   from Ordermas inner join Trs_grn2 on Trs_GRN2.ordid = Ordermas.OrdId  inner join stocktable on stocktable.StockID =trs_grn2.StockID  inner join trs_grn1 on trs_grn2.id = trs_grn1.ID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID  left outer join Mas_Design on Mas_Design.DesignId = StockTable.PRINT_DESIGNID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID inner join Mas_Dept on Mas_Dept.DeptID = Trs_Grn1.Dept  where ordermas.OrdId=@Ordid and StockTable.Dept in(@Dept)  and trs_grn1.GRNType = 'Process Return'/* and Mas_fabric.PriUomID <> 2*/   group by Fabdesc,ColorDesc,Trs_grn2.RecKgs,Mas_Dept.Deptname,Mas_Dept.DeptID
,Mas_Dept.grp,isnull(Mas_Design.DesignDesc,'')   


union all

   select distinct Mas_Fabric.Fabdesc,isnull(Mas_Design.DesignDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,0  as Trnsin,0 as transout,0 as openkgs,0  as stockkgs,sum(Trs_ReadyToCut2.kg) as issuekgs,Mas_Dept.Deptname  as Receivngdept ,0 as issret,Mas_Dept.DeptID as recdeptid     from Ordermas inner join Trs_ReadyToCut2 on Trs_ReadyToCut2.ordid = OrderMas.OrdId  inner join Trs_ReadyToCut1 on Trs_ReadyToCut2.id = Trs_ReadyToCut1.ID inner join stocktable on stocktable.StockID =Trs_ReadyToCut2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Design on Mas_Design.DesignId = StockTable.PRINT_DESIGNID  left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID inner join Mas_Dept on Mas_Dept.DeptID =Trs_ReadyToCut1.Prs_Dept  where ordermas.OrdId=@Ordid and StockTable.Dept    in(@Dept) and  TrType = 20 /* and Mas_fabric.PriUomID <> 2*/  group by Mas_Fabric.Fabdesc,Mas_Dept.DeptID
,ColorDesc,Trs_ReadyToCut2.Kg,Deptname,Mas_Dept.grp,isnull(Mas_Design.DesignDesc,'')   


union all

   select distinct Mas_Fabric.Fabdesc,isnull(Mas_Design.DesignDesc,'') as ColorDesc,0 as Reqkgs,0 as grnkgs ,0 as  Prsgrnkgs,0  as Trnsin,0 as transout,0 as openkgs,0  as stockkgs,sum(Trs_ReadyToCut2.kg) as issuekgs,'' as Receivngdept ,0 as issret,0 as recdeptid     from Ordermas inner join Trs_ReadyToCut2 on Trs_ReadyToCut2.ordid = OrderMas.OrdId  inner join Trs_ReadyToCut1 on Trs_ReadyToCut2.id = Trs_ReadyToCut1.ID inner join stocktable on stocktable.StockID =Trs_ReadyToCut2.StockID left outer join Mas_Design on Mas_Design.DesignId = StockTable.PRINT_DESIGNID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_Fabric on Mas_Fabric.FabID = stocktable.FabID inner join Mas_Dept on Mas_Dept.DeptID =Trs_ReadyToCut1.Prs_Dept  where ordermas.OrdId=@Ordid and StockTable.Dept    in(@Dept) and  TrType = 20 /* and Mas_fabric.PriUomID <> 2*/  group by Mas_Fabric.Fabdesc
,ColorDesc,Trs_ReadyToCut2.Kg,Deptname,Mas_Dept.grp,isnull(Mas_Design.DesignDesc,'')   


 )x group by Fabdesc,ColorDesc,Receivngdept,recdeptid



