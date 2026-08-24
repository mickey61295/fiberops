/*;=============================================   
; Author           :  Global Software's    
; Create date      :  09/07/2021    
; Create By        :  ASLAM  
; Description      :  Supplier Production Stock  
; Change Person    :  ASLAM
; Last Change Date :  09/07/2021 10.30 AM 
; =============================================  */  
CREATE PROCEDURE Supp_PROC_Stock_ProdPieces (@Id Int,@SizeId Int,@ProdPcs Int) As DECLARE @Coycode Int,@Ordid Int,@StyleNo Varchar(20),@StageId Int,@PartId Int,@GodId Int,@ColId Int,@StockQty Int,@SourceStageId Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int,@Rework Int,@RejectionTypeId Int ,@LotNo Varchar(15),@LotId Int  ,@EntryOption int  ,@ComboID int   

Select @Coycode = CoyId From Trs_SuppProdentry Where Id=@Id        

Select @PartyId = 0     SELECT @Ordid = OrdId From Trs_SuppProdentry Where Id=@Id
SELECT @StyleNo = StyleNo From Trs_SuppProdentry Where Id=@Id      
SELECT @Stageid = StageId From Trs_SuppProdentry Where Id=@Id     

SELECT @SourceStageId = SourceStageId From Trs_SuppProdentry Where Id=@Id     

SELECT @PartId = PartId From Trs_SuppProdentry Where Id=@Id     
SELECT @GodId = GodId From Trs_SuppProdentry Where Id=@Id     
SELECT @Rework = Rework From Trs_SuppProdentry Where Id=@Id     
SELECT @RejectionTypeId = RejectionTypeId From Trs_SuppProdentry Where Id=@Id     
SELECT @LotID = Isnull(LotID,0) From Trs_SuppProdentry Where Id=@Id     

Select @SeqNo = SeqNo From Trs_SuppProdentry Inner Join  Prod_Sequence On Trs_SuppProdentry.OrdId=Prod_Sequence.OrdId And Trs_SuppProdentry.StyleNo=Prod_Sequence.StyleNo And Trs_SuppProdentry.StageId=Prod_Sequence.StageId Where Id=@Id     

SELECT @ComboID = ClrID From Trs_SuppProdentry Where Id=@Id     
SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_SuppProdentry Inner Join Mas_JobWrkComp On  Trs_SuppProdentry.StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_SuppProdentry.Id=@Id     
SELECT @ColId = ClrId From Trs_SuppProdentry Where Id=@Id      
SELECT @StockQty = @ProdPcs     

Select @EntryOption = EntryOption from OrderStyleDtl A INNER JOIN ORDERMAS ON A.Ordid = OrderMas.OrdID INNER JOIN SuppOrdMas ON OrderMas.Ordid = SuppOrdMas.Ordid  Where SuppOrdMas.SuppOrdId= @Ordid And StyleNo = @StyleNo        	

BEGIN   
IF EXISTS (select * from SuppPcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and  Stageid = @Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId)      
BEGIN      
Select @PcsStockId=PcsStockId From SuppPcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId      

If EXISTS (select * from SuppPcs_StockTable Inner Join SuppPcs_StockTableQty On SuppPcs_StockTable.PcsStockId=SuppPcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and SuppPcs_StockTableQty.ColId=@Colid and SuppPcs_StockTableQty.SizeId=@SizeId and IsNull(SuppPcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(SuppPcs_StockTableQty.RejectionTypeId,0)=0)     
Begin     

Update SuppPcs_StockTableQty Set SuppPcs_StockTableQty.StockQty=SuppPcs_StockTableQty.StockQty +@StockQty,SuppPcs_StockTableQty.ProductionQty=SuppPcs_StockTableQty.ProductionQty+
@StockQty From  SuppPcs_StockTableQty Inner Join SuppPcs_StockTable On SuppPcs_StockTable.PcsStockId=SuppPcs_StockTableQty.PcsStockId  where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@Stageid and PartId=@PartId and GodId=@GodId
 and PartyId=@PartyId and SuppPcs_StockTableQty.ColId=@Colid and  SuppPcs_StockTableQty.SizeId=@SizeId and IsNull(SuppPcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(SuppPcs_StockTableQty.RejectionTypeId,0)=0   
 End    
 Else    
 Begin    
 INSERT INTO SuppPcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId)  VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0)   
 End   
 END     
 ELSE     
 BEGIN   
 Select @PcsStockId=IsNull(Max(PcsStockId),0)+1 From SuppPcs_StockTable   
 INSERT INTO SuppPcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotId)  VALUES (@Coycode,@Ordid,@StyleNo,@Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotID)    
 
 INSERT INTO SuppPcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0)   
 End      
 If @StageId<>1  And @FinalStage='S' And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'      
 BEGIN   
 Select @PcsStockId=PcsStockId From SuppPcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and  Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId  

 Update SuppPcs_StockTableQty Set SuppPcs_StockTableQty.StockQty=SuppPcs_StockTableQty.StockQty-@StockQty From SuppPcs_StockTableQty Inner Join SuppPcs_StockTable On SuppPcs_StockTable.PcsStockId=SuppPcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and SuppPcs_StockTableQty.ColId=@Colid and SuppPcs_StockTableQty.SizeId=@SizeId and IsNull(SuppPcs_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End and IsNull(SuppPcs_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId 
 End  
 END   
 
 If @StageId=1  And @FinalStage='S' And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'    and @Rework =1  BEGIN   
 Select @PcsStockId=PcsStockId From SuppPcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and  Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId  

 Update SuppPcs_StockTableQty Set SuppPcs_StockTableQty.StockQty=SuppPcs_StockTableQty.StockQty-@StockQty From SuppPcs_StockTableQty Inner Join SuppPcs_StockTable On SuppPcs_StockTable.PcsStockId=SuppPcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and SuppPcs_StockTableQty.ColId=@Colid and SuppPcs_StockTableQty.SizeId=@SizeId and IsNull(SuppPcs_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End and IsNull(SuppPcs_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End  END  If @StageId<>1 And @FinalStage='F' And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'   
 BEGIN  
 Select @PcsStockId=PcsStockId From Pcs_StockTable Where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@SourceStageId  and  GodId=@GodId and PartyId=@PartyId   
 if @EntryOption =1  
 Begin     
 Update SuppPcs_StockTableQty Set SuppPcs_StockTableQty.StockQty=SuppPcs_StockTableQty.
StockQty-@StockQty    From SuppPcs_StockTableQty Inner Join SuppPcs_StockTable On SuppPcs_StockTable.PcsStockId=SuppPcs_StockTableQty.PcsStockId  INNER JOIN Trs_SuppProdentry_SourceStageDtl ON  SuppPcs_StockTable.PartId = Trs_SuppProdentry_SourceStageDtl.PartId And  SuppPcs_StockTable.StageId  = Trs_SuppProdentry_SourceStageDtl.SourceStageId  where Trs_SuppProdentry_SourceStageDtl.ID = @Id And  coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId  and GodId=@GodId and PartyId=@PartyId and SuppPcs_StockTableQty.SizeId=@SizeId And SuppPcs_StockTableQty.Colid = @ColId and  IsNull(SuppPcs_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End and IsNull(SuppPcs_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End      END  
   Else     
   BEGIN  /* Reduct the Stock(PackOrder) - Noofpcs from each colour*/    	 
   
   Update SuppPcs_StockTableQty Set SuppPcs_StockTableQty.StockQty=SuppPcs_StockTableQty.StockQty-(@StockQty*IsNull(OrderQtyDtl.PcsPerColor,1)) From SuppPcs_StockTableQty Inner Join SuppPcs_StockTable On SuppPcs_StockTable.PcsStockId=SuppPcs_StockTableQty.PcsStockId  INNER JOIN SuppOrdDet on SuppPcs_StockTable.Styleno = SuppOrdDet.StyleNo And SuppOrdDet.ClrId = SuppPcs_StockTableQty.Colid  And SuppOrdDet.SizeId =
 SuppPcs_StockTableQty.SizeId INNER JOIN SuppOrdMas ON SuppOrdDet.SuppOrdID = SuppOrdMas.SuppOrdID  and  SuppPcs_StockTable.Ordid = SuppOrdMas.Ordid   
 INNER JOIN OrderQtyDtl ON SuppOrdMas.Ordid = OrderQtyDtl.Ordid And SuppOrdDet.StyleNo = OrderQtyDtl.StyleNo And SuppOrdDet.ClrId = OrderQtyDtl.ColID And SuppOrdDet.SizeId = OrderQtyDtl.SizeId  
 And OrderQtyDtl.PartId = SuppPcs_StockTable.PartID  LEFT OUTER JOIN Mas_Lot ON OrderQtyDtl.LotNo = Mas_Lot.LotName	 INNER JOIN Trs_SuppProdentry_SourceStageDtl ON  SuppPcs_StockTable.PartId = Trs_SuppProdentry_SourceStageDtl.PartId And Pcs_StockTable.StageId  = Trs_SuppProdentry_SourceStageDtl.SourceStageId    WHERE Trs_SuppProdentry_SourceStageDtl.ID = @Id And SuppPcs_StockTable.coycode=@coycode and SuppPcs_StockTable.Ordid=@Ordid and SuppPcs_StockTable.StyleNo=@StyleNo and LotId = @LotId  and GodId=@GodId and PartyId=@PartyId and SuppPcs_StockTableQty.SizeId=@SizeId     and OrderQtyDtl.CmbClrID=@ComboID   and IsNull(SuppPcs_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End and IsNull(SuppPcs_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End    
 END      
 End   	
 End 